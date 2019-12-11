(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package['modules-runtime'].meteorInstall;

var require = meteorInstall({"node_modules":{"meteor":{"modules":{"server.js":function(require){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/modules/server.js                                                                       //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
require("./install-packages.js");
require("./process.js");
require("./reify.js");

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"install-packages.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/modules/install-packages.js                                                             //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
function install(name, mainModule) {
  var meteorDir = {};

  // Given a package name <name>, install a stub module in the
  // /node_modules/meteor directory called <name>.js, so that
  // require.resolve("meteor/<name>") will always return
  // /node_modules/meteor/<name>.js instead of something like
  // /node_modules/meteor/<name>/index.js, in the rare but possible event
  // that the package contains a file called index.js (#6590).

  if (typeof mainModule === "string") {
    // Set up an alias from /node_modules/meteor/<package>.js to the main
    // module, e.g. meteor/<package>/index.js.
    meteorDir[name + ".js"] = mainModule;
  } else {
    // back compat with old Meteor packages
    meteorDir[name + ".js"] = function (r, e, module) {
      module.exports = Package[name];
    };
  }

  meteorInstall({
    node_modules: {
      meteor: meteorDir
    }
  });
}

// This file will be modified during computeJsOutputFilesMap to include
// install(<name>) calls for every Meteor package.

install("meteor");
install("meteor-base");
install("mobile-experience");
install("npm-mongo");
install("ecmascript-runtime");
install("modules-runtime");
install("modules", "meteor/modules/server.js");
install("modern-browsers", "meteor/modern-browsers/modern.js");
install("es5-shim");
install("promise", "meteor/promise/server.js");
install("ecmascript-runtime-client", "meteor/ecmascript-runtime-client/versions.js");
install("ecmascript-runtime-server", "meteor/ecmascript-runtime-server/runtime.js");
install("babel-compiler");
install("ecmascript");
install("babel-runtime", "meteor/babel-runtime/babel-runtime.js");
install("fetch", "meteor/fetch/server.js");
install("inter-process-messaging", "meteor/inter-process-messaging/inter-process-messaging.js");
install("dynamic-import", "meteor/dynamic-import/server.js");
install("base64", "meteor/base64/base64.js");
install("ejson", "meteor/ejson/ejson.js");
install("diff-sequence", "meteor/diff-sequence/diff.js");
install("geojson-utils", "meteor/geojson-utils/main.js");
install("id-map", "meteor/id-map/id-map.js");
install("random");
install("mongo-id", "meteor/mongo-id/id.js");
install("ordered-dict", "meteor/ordered-dict/ordered_dict.js");
install("tracker");
install("minimongo", "meteor/minimongo/minimongo_server.js");
install("check", "meteor/check/match.js");
install("retry", "meteor/retry/retry.js");
install("callback-hook", "meteor/callback-hook/hook.js");
install("ddp-common");
install("reload");
install("socket-stream-client", "meteor/socket-stream-client/node.js");
install("ddp-client", "meteor/ddp-client/server/server.js");
install("underscore");
install("logging", "meteor/logging/logging.js");
install("routepolicy", "meteor/routepolicy/main.js");
install("boilerplate-generator", "meteor/boilerplate-generator/generator.js");
install("webapp-hashing");
install("webapp", "meteor/webapp/webapp_server.js");
install("ddp-server");
install("ddp");
install("allow-deny");
install("mongo-decimal", "meteor/mongo-decimal/decimal.js");
install("binary-heap", "meteor/binary-heap/binary-heap.js");
install("mongo");
install("reactive-var");
install("standard-minifier-css");
install("standard-minifier-js");
install("shell-server", "meteor/shell-server/main.js");
install("less");
install("static-html");
install("tmeasday:check-npm-versions", "meteor/tmeasday:check-npm-versions/check-npm-versions.js");
install("react-meteor-data", "meteor/react-meteor-data/react-meteor-data.jsx");
install("bkruse:pace");
install("dburles:collection-helpers");
install("url", "meteor/url/url_server.js");
install("http", "meteor/http/httpcall_server.js");
install("reywood:publish-composite", "meteor/reywood:publish-composite/lib/publish_composite.js");
install("jquery");
install("universe:i18n", "meteor/universe:i18n/lib/i18n.js");
install("server-render", "meteor/server-render/server.js");
install("livedata");
install("hot-code-push");
install("launch-screen");
install("autoupdate", "meteor/autoupdate/autoupdate_server.js");

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"process.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/modules/process.js                                                                      //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
if (! global.process) {
  try {
    // The application can run `npm install process` to provide its own
    // process stub; otherwise this module will provide a partial stub.
    global.process = require("process");
  } catch (missing) {
    global.process = {};
  }
}

var proc = global.process;

if (Meteor.isServer) {
  // Make require("process") work on the server in all versions of Node.
  meteorInstall({
    node_modules: {
      "process.js": function (r, e, module) {
        module.exports = proc;
      }
    }
  });
} else {
  proc.platform = "browser";
  proc.nextTick = proc.nextTick || Meteor._setImmediate;
}

if (typeof proc.env !== "object") {
  proc.env = {};
}

var hasOwn = Object.prototype.hasOwnProperty;
for (var key in meteorEnv) {
  if (hasOwn.call(meteorEnv, key)) {
    proc.env[key] = meteorEnv[key];
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"reify.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/modules/reify.js                                                                        //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
require("reify/lib/runtime").enable(
  module.constructor.prototype
);

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"reify":{"lib":{"runtime":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/meteor/modules/node_modules/reify/lib/runtime/index.js                              //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
meteorInstall({"node_modules":{"bech32":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/bech32/package.json                                                                 //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "bech32",
  "version": "1.1.3",
  "main": "index.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/bech32/index.js                                                                     //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cheerio":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/cheerio/package.json                                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "cheerio",
  "version": "1.0.0-rc.3",
  "main": "./index.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/cheerio/index.js                                                                    //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"@babel":{"runtime":{"helpers":{"interopRequireDefault.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/@babel/runtime/helpers/interopRequireDefault.js                                     //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"objectSpread.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/@babel/runtime/helpers/objectSpread.js                                              //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"extends.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/@babel/runtime/helpers/extends.js                                                   //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"objectWithoutProperties.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/@babel/runtime/helpers/objectWithoutProperties.js                                   //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/@babel/runtime/package.json                                                         //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"tendermint":{"lib":{"pubkey.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/tendermint/lib/pubkey.js                                                            //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"moment":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/moment/package.json                                                                 //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "moment",
  "version": "2.24.0",
  "main": "./moment.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"moment.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/moment/moment.js                                                                    //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/lodash/package.json                                                                 //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "lodash",
  "version": "4.17.15",
  "main": "lodash.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"lodash.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/lodash/lodash.js                                                                    //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"js-sha256":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/js-sha256/package.json                                                              //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "js-sha256",
  "version": "0.9.0",
  "main": "src/sha256.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"src":{"sha256.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/js-sha256/src/sha256.js                                                             //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"fibers":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/fibers/package.json                                                                 //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "fibers",
  "version": "3.1.1",
  "main": "fibers"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"fibers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/fibers/fibers.js                                                                    //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"react":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/react/package.json                                                                  //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "react",
  "version": "16.12.0",
  "main": "index.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/react/index.js                                                                      //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/modules/server.js");

/* Exports */
Package._define("modules", exports, {
  meteorInstall: meteorInstall
});

})();
