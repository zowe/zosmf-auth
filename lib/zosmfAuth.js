/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const https = require('https');

const loginUrl = '/zosmf/workflow/rest/1.0/workflows';

function ZosmfAuthenticator(pluginDef, pluginConf, serverConf) {
  this.authPluginID = pluginDef.identifier;
}

ZosmfAuthenticator.prototype = {

  getStatus(sessionState) {
    return {  
      authenticated: !!sessionState.authenticated, 
      username: sessionState.zosmfUsername
    };
  },
    
  /**
   * Should be called e.g. when the users enters credentials
   * 
   * Supposed to change the state of the client-server session. NOP for 
   * stateless authentication (e.g. HTTP basic). 
   * 
   * `request` must be treated as read-only by the code. `sessionState` is this
   * plugin's private storage within the session (if stateful)
   * 
   * If auth doesn't fail, should return an object containing at least 
   * { success: true }. Should not reject the promise.
   */ 
  authenticate(request, sessionState) {
    return new Promise((resolve, reject) => {
      const username = request.body.username;
      const password = request.body.password;
      request.zluxData.plugin.callService("zosmf", loginUrl, {
        method: 'HEAD',
        auth: username + ":" + password
      }).then(response => {
        let zosmfCookie;
        if (response.statusCode === 200) {
          if (response.headers['set-cookie']) {
            for (const cookie of response.headers['set-cookie']) {
              //TODO properly manage cookie expiration
              const content = cookie.split(';')[0];
              if (content.indexOf('LtpaToken2') >= 0) {
                zosmfCookie = content;
              }
            }
          }
        }
        if (zosmfCookie) {
          sessionState.zosmfUsername = request.body.username;
          sessionState.authenticated = true;
          sessionState.zosmfCookies = zosmfCookie;
          resolve({ success: true })
        } else {
          sessionState.authenticated = false;
          delete sessionState.zosmfUsername;
          delete sessionState.zosmfCookies;
          resolve({ 
            success: false,
            error: {
              message:  `${response.statusCode} ${response.statusMessage}`
            }
         })
        }
      }).catch(function(e) {
        sessionState.authenticated = false;
        delete sessionState.zosmfUsername;
        delete sessionState.zosmfCookies;
        resolve({ 
          success: false, 
          error: e
        })
      });
    });
  },

  /**
   * Invoked for every service call by the middleware.
   * 
   * Checks if the session is valid in a stateful scheme, or authenticates the
   * request in a stateless scheme. Then checks if the user can access the
   * resource.  Modifies the request if necessary.
   * 
   * `sessionState` is this plugin's private storage within the session (if 
   * stateful)
   * 
   * The promise should resolve to an object containing, at least, 
   * { authorized: true } if everything is fine. Should not reject the promise.
   */
  authorized(request, sessionState) {
    if (request.method == 'HEAD' && request.url == loginUrl) {
      return Promise.resolve({  authenticated: false, authorized: true });
    }
    if (sessionState.authenticated) {
      request.username = sessionState.zosmfUsername;
      return Promise.resolve({  authenticated: true, authorized: true });
    } else {
      return Promise.resolve({  authenticated: false, authorized: false });
    }
  }, 
  
  addProxyAuthorizations(req1, req2Options, sessionState) {
    //console.log("sessionState.zosmfCookies", sessionState.zosmfCookies)
    if (!sessionState.zosmfCookies) {
      return;
    }
    req2Options.headers['cookie'] = sessionState.zosmfCookies;
  }
};

module.exports = function(pluginDef, pluginConf, serverConf) {
  return Promise.resolve(new ZosmfAuthenticator(pluginDef, pluginConf, 
      serverConf));
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
