/* @flow */
/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import EventEmitter from 'events';

type OnPublishCallback = (payload: any) => Promise<void>;

class LocalPubSub {
  _eventEmitter: EventEmitter;

  constructor() {
    this._eventEmitter = new EventEmitter();
  }

  subscribe(topic: string, callback: OnPublishCallback): void {
    this._eventEmitter.addListener(topic, callback);
  }

  unsubscribe(topic: string, callback: OnPublishCallback): void {
    this._eventEmitter.removeListener(topic, callback);
  }

  publish(topic: string, payload: any): void {
    this._eventEmitter.emit(topic, payload);
  }
}

export default new LocalPubSub();
