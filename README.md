This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.
# Z/OSMF Auth Plugin
Auth handler for Zowe App Framework Server to establish user sessions with z/osmf and utilize it for authentication. See the [Auth web API](https://github.com/zowe/zlux/wiki/Authentication-with-ZLUX) and [Server config](https://github.com/zowe/zlux/wiki/Configuration-for-ZLUX-App-Server-&-ZSS) wiki pages for more info.

**To request features or report bugs, please use the issues page at the [zlux repo](https://github.com/zowe/zlux/issues) with the server security tag**

Auth plugins can be associated with non-auth plugins such that dataservices will not be processed without first passing authentication and authorization checks for the auth plugins associated with them.
In the case of this plugin, you can use this plugin to secure services that may be used to do REST calls to a z/osmf installation.

Because this plugin uses z/osmf sessions to confirm authentication, this plugin must be configured to know which z/osmf installation to target.

Before use, edit the file `proxy/remote.json` by setting the host and port that points to a running z/osmf instance.
Afterwards, be sure to run a Zowe deploy process by moving to `/zlux-build` and running `ant deploy`.

This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.
