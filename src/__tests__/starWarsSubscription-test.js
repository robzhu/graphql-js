/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { expect } from 'chai';
import { describe, it, afterEach } from 'mocha';
import { StarWarsSchema } from './starWarsSchema.js';
import { subscribe, publish, getSubscriptionDefinition } from '../subscription/subscribe';

// 80+ char lines are useful in describe/it, so ignore in this file.
/* eslint-disable max-len */

const disturbanceSubscription = `
  subscription DisturbancesInTheForce {
    disturbance {
      magnitude
    }
  }
`;

let subscriptionToken;

describe('Star Wars Subscription Tests', () => {
  describe('Basic Subscription', () => {

    afterEach(() => {
      if (subscriptionToken) {
        subscriptionToken.unsubscribe();
      }
      subscriptionToken = null;
    });

    it('Can subscribe to a valid query', async () => {
      subscriptionToken = await subscribe(
        {
          schema: StarWarsSchema,
          query: disturbanceSubscription,
        },
        () => {}
      );

      expect(subscriptionToken).not.to.be.null;
    });

    it('Invalid query results in errors', async () => {
      const badQuery = `
        subscription {
          meow
        }
      `;

      try {
        subscriptionToken = await subscribe(
          {
            schema: StarWarsSchema,
            query: badQuery,
          },
          () => {}
        );
        expect.fail('should have thrown');
      } catch(e) {
        expect(e.message).to.equal('Cannot query field "meow" on type "Subscription".');
      }
    });

    it('Can parse subsription definition from valid query', async () => {
      const subscriptionDefinition = getSubscriptionDefinition(
        StarWarsSchema,
        disturbanceSubscription
      );

      expect(subscriptionDefinition).not.to.be.null;
    });

    it('Publishing a payload causes callback to run', async () => {
      let callbackRan = false;
      subscriptionToken = await subscribe(
        {
          schema: StarWarsSchema,
          query: disturbanceSubscription,
        },
        () => {
          callbackRan = true;
        }
      );

      const subscriptionDefinition = getSubscriptionDefinition(
        StarWarsSchema,
        disturbanceSubscription
      );

      expect(callbackRan).to.be.false;
      await publish(subscriptionDefinition.name, {});
      expect(callbackRan).to.be.true;
    });

    it('Publish delivers expected payload', async () => {
      let callbackPayload = null;
      subscriptionToken = await subscribe(
        {
          schema: StarWarsSchema,
          query: disturbanceSubscription,
        },
        payload => {
          callbackPayload = payload;
        }
      );

      const subscriptionDefinition = getSubscriptionDefinition(
        StarWarsSchema,
        disturbanceSubscription
      );

      expect(callbackPayload).to.be.null;
      await publish(subscriptionDefinition.name, {
        magnitude: 5,
      });
      expect(callbackPayload.data.disturbance).to.deep.equal({
        magnitude: 5,
      });
    });

    it('Publish delivers expected payload when subscribiption has variables', async () => {
      const disturbanceSubscription = `
        subscription DisturbancesInTheForce($reason: String) {
          disturbance(reason: $reason) {
            magnitude
            reason
          }
        }
      `;

      const variables = {
        reason: 'Alderaan destroyed'
      };

      let callbackPayload = null;
      subscriptionToken = await subscribe(
        {
          schema: StarWarsSchema,
          query: disturbanceSubscription,
          variableValues: variables,
          operationName: 'DisturbancesInTheForce',
        },
        payload => {
          callbackPayload = payload;
        }
      );

      const subscriptionDefinition = getSubscriptionDefinition(
        StarWarsSchema,
        disturbanceSubscription
      );

      expect(callbackPayload).to.be.null;
      await publish(subscriptionDefinition.name, {
        magnitude: 10,
      });

      expect(callbackPayload.data).to.deep.equal({
        disturbance: {
          magnitude: 10,
          reason: 'Alderaan destroyed'
        }
      });
    });

    it('Publishes after unsusbscribe do not trigger callback', async () => {
      let callbackRan = false;
      subscriptionToken = await subscribe({
        schema: StarWarsSchema,
        query: disturbanceSubscription,
      },
      () => {
        callbackRan = true;
      });

      const subscriptionDefinition = getSubscriptionDefinition(
        StarWarsSchema,
        disturbanceSubscription
      );

      expect(callbackRan).to.be.false;
      await subscriptionToken.unsubscribe();
      await publish(subscriptionDefinition.name, {});
      expect(callbackRan).to.be.false;
    });
  });
});
