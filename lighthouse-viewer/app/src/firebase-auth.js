/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {initializeApp} from 'firebase/app';
import {getAuth, onAuthStateChanged, signInWithPopup, signOut, GithubAuthProvider} from 'firebase/auth';
import idbKeyval from 'idb-keyval';

/**
 * Wrapper for Firebase authentication.
 */
export class FirebaseAuth {
  constructor() {
    /** @type {?string} */
    this._accessToken = null;
    /** @type {?import('firebase/auth').User} */
    this._firebaseUser = null;
    this._firebaseApp = initializeApp({
      apiKey: 'AIzaSyApMz8FHTyJNqqUtA51tik5Mro8j-2qMcM',
      authDomain: 'lighthouse-viewer.firebaseapp.com',
      databaseURL: 'https://lighthouse-viewer.firebaseio.com',
      storageBucket: 'lighthouse-viewer.appspot.com',
      messagingSenderId: '962507201498',
    });
    this._auth = getAuth();
    this._provider = new GithubAuthProvider();
    this._provider.addScope('gist');

    /**
     * Promise which resolves after the first check of auth state. After this,
     * _accessToken will be set if user is logged in and has access token.
     * @type {Promise<void>}
     */
    this._ready = Promise.all([
      new Promise(resolve => onAuthStateChanged(this._auth, resolve)),
      idbKeyval.get('accessToken'),
    ]).then(([user, token]) => {
      if (user && token) {
        this._accessToken = token;
        this._firebaseUser = user;
      }
    });
  }

  /**
   * Returns the GitHub access token if already logged in. If not logged in,
   * returns null (and will not trigger sign in).
   * @return {Promise<?string>}
   */
  async getAccessTokenIfLoggedIn() {
    await this._ready;
    return this._accessToken;
  }

  /**
   * Returns the GitHub access token, triggering sign in if needed.
   * @return {Promise<string>}
   */
  async getAccessToken() {
    await this._ready;
    if (this._accessToken) return this._accessToken;
    return this.signIn();
  }

  /**
   * Signs in the user to GitHub using the Firebase API.
   * @return {Promise<string>} The logged in user.
   */
  async signIn() {
    const result = await signInWithPopup(this._auth, this._provider);
    /** @type {string} */
    const accessToken = result.credential.accessToken;
    this._accessToken = accessToken;
    this._firebaseUser = result.user;
    // A limitation of firebase auth is that it doesn't return an oauth token
    // after a page refresh. We'll get a firebase token, but not an oauth token
    // for GitHub. Since GitHub's tokens never expire, stash the access token in IDB.
    await idbKeyval.set('accessToken', accessToken);
    return accessToken;
  }

  /**
   * Signs the user out.
   * @return {Promise<void>}
   */
  async signOut() {
    await signOut(this._auth);
    this._accessToken = null;
    await idbKeyval.delete('accessToken');
  }
}
