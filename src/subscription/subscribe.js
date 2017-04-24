/* @flow */
/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { parse, Source } from '../language';
import { validate } from '../validation/validate';
import { execute } from '../execution/execute';
import type { GraphQLSchema } from '../type/schema';
import type { ExecutionResult } from '../execution/execute';
import type { GraphQLError } from '../error';
import type { GraphQLFieldMap } from '../type/definition';
import type { SelectionNode } from '../language/ast';
import pubsub from './localPubSub';

export type SubscriptionParams = {
  schema: GraphQLSchema,
  query: string,
  contextValue?: mixed,
  variableValues?: ?{[key: string]: mixed},
  operationName?: ?string
};

export type SubscriptionToken = {
  unsubscribe: () => Promise<void>
};

export type SubscriptionResult = {
  subscription?: SubscriptionToken,
  errors?: ?Array<GraphQLError>
};

export function getSubscriptionDefinition(
  schema: GraphQLSchema,
  query: string
): GraphQLFieldMap<*, *> {
  const rootField = getRootNode(schema, query);
  return getSubscriptionDefinitionFromRootField(schema, rootField);
}

export function getRootNode(
  schema: GraphQLSchema,
  query: string
): SelectionNode {
  const source = new Source(query || '', 'GraphQL request');
  const ast = parse(query);
  const validationErrors = validate(schema, ast);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0].message);
  }
  const selectionSet = ast.definitions[0].selectionSet;
  return selectionSet.selections[0];
}

export function getSubscriptionDefinitionFromRootField(
  schema: GraphQLSchema,
  rootField: SelectionNode
): GraphQLFieldMap<*, *> {
  const subscriptionType = schema.getSubscriptionType();
  if (!subscriptionType) {
    throw new Error('No Subscription types found in schema');
  }
  const subscriptionFields = subscriptionType.getFields();
  const rootFieldName = rootField.name.value;
  return subscriptionFields[rootFieldName];
}

export async function subscribe(
  params: SubscriptionParams,
  callback: (payload: any) => void
): Promise<SubscriptionToken> {
  const ast = parse(params.query);
  const subscriptionDefinition = getSubscriptionDefinition(
    params.schema,
    params.query,
  );

  const onPublish = async (payload) => {
    // note that payload is treated as the rootValue
    const result = await execute(
      params.schema,
      ast,
      payload,
      params.contextValue,
      params.variableValues,
      params.operationName,
    );
    callback(result);
  };

  pubsub.subscribe(subscriptionDefinition.name, onPublish);

  return {
    unsubscribe: async () => {
      pubsub.unsubscribe(subscriptionDefinition.name, onPublish);
    }
  };
}

export async function publish(
  subscriptionDefinition: GraphQLFieldMap<*, *>,
  payload: any
): Promise<void> {
  pubsub.publish(subscriptionDefinition.name, payload);
}
