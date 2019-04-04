/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
const loginUrl = '/zosmf/workflow/rest/1.0/workflows';

const DEFAULT_EXPIRATION_MS = 29700000; //495 minutes, according to zosmf configuration docs

function ZosmfAuthenticator(pluginDef, pluginConf, serverConf) {
  this.authPluginID = pluginDef.identifier;
  this.sessionExpirationMS = DEFAULT_EXPIRATION_MS; //according to zosmf configuration docs
}

ZosmfAuthenticator.prototype = {

  getStatus(sessionState) {
    const expms = sessionState.sessionExpTime - Date.now();
    if (expms <= 0 || sessionState.sessionExpTime === undefined) {
      sessionState.authenticated = false;
      delete sessionState.zosmfUsername;
      delete sessionState.zosmfCookies;
      return { authenticated: false };
    }    
    return {  
      authenticated: !!sessionState.authenticated, 
      username: sessionState.zosmfUsername,
      expms: sessionState.sessionExpTime ? expms : undefined
    };
  },

  _authenticateOrRefresh(request, sessionState, isRefresh) {
    return new Promise((resolve, reject) => {
      if (isRefresh && !sessionState.zosmfCookies) {
        reject(new Error('No cookie given for refresh or check, skipping zosmf request'));
        return;
      }
      if (!isRefresh && !request.body) {
        resolve({success: false, error: {message: `Missing login credentials`}});
        return;
      }
      let options = isRefresh ? {
        method: 'HEAD',
        headers: {'cookie': sessionState.zosmfCookies}
      } : {
        method: 'HEAD',
        auth: request.body.username + ":" + request.body.password      
      };
      
      request.zluxData.plugin.callService("zosmf", loginUrl, options).then(response => {
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
          if (!isRefresh) {
            sessionState.zosmfUsername = request.body.username;
          }
          sessionState.authenticated = true;
          sessionState.sessionExpTime = Date.now() + DEFAULT_EXPIRATION_MS;
          sessionState.zosmfCookies = zosmfCookie;
          resolve({ success: true, username: sessionState.zosmfUsername, expms: DEFAULT_EXPIRATION_MS })
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
        reject(e);
      });
    });
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
    this._authenticateOrRefresh(request, sessionState, false).catch((e)=> {
      sessionState.authenticated = false;
      delete sessionState.zosmfUsername;
      delete sessionState.zosmfCookies;
      return { 
        success: false, 
        error: e
      };
    });
  },

  //TODO unimplemented refreshing, just dont do anything for now and let session expire naturally
  refreshStatus(request, sessionState) {
    return new Promise((resolve, reject) => {
      resolve({ success: false }) 
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
