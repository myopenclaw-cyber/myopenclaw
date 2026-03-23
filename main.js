"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/electron-updater/node_modules/universalify/index.js
var require_universalify = __commonJS({
  "node_modules/electron-updater/node_modules/universalify/index.js"(exports2) {
    "use strict";
    exports2.fromCallback = function(fn) {
      return Object.defineProperty(function(...args) {
        if (typeof args[args.length - 1] === "function") fn.apply(this, args);
        else {
          return new Promise((resolve5, reject) => {
            args.push((err, res) => err != null ? reject(err) : resolve5(res));
            fn.apply(this, args);
          });
        }
      }, "name", { value: fn.name });
    };
    exports2.fromPromise = function(fn) {
      return Object.defineProperty(function(...args) {
        const cb = args[args.length - 1];
        if (typeof cb !== "function") return fn.apply(this, args);
        else {
          args.pop();
          fn.apply(this, args).then((r) => cb(null, r), cb);
        }
      }, "name", { value: fn.name });
    };
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform2 = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs15) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs15);
      }
      if (!fs15.lutimes) {
        patchLutimes(fs15);
      }
      fs15.chown = chownFix(fs15.chown);
      fs15.fchown = chownFix(fs15.fchown);
      fs15.lchown = chownFix(fs15.lchown);
      fs15.chmod = chmodFix(fs15.chmod);
      fs15.fchmod = chmodFix(fs15.fchmod);
      fs15.lchmod = chmodFix(fs15.lchmod);
      fs15.chownSync = chownFixSync(fs15.chownSync);
      fs15.fchownSync = chownFixSync(fs15.fchownSync);
      fs15.lchownSync = chownFixSync(fs15.lchownSync);
      fs15.chmodSync = chmodFixSync(fs15.chmodSync);
      fs15.fchmodSync = chmodFixSync(fs15.fchmodSync);
      fs15.lchmodSync = chmodFixSync(fs15.lchmodSync);
      fs15.stat = statFix(fs15.stat);
      fs15.fstat = statFix(fs15.fstat);
      fs15.lstat = statFix(fs15.lstat);
      fs15.statSync = statFixSync(fs15.statSync);
      fs15.fstatSync = statFixSync(fs15.fstatSync);
      fs15.lstatSync = statFixSync(fs15.lstatSync);
      if (fs15.chmod && !fs15.lchmod) {
        fs15.lchmod = function(path16, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs15.lchmodSync = function() {
        };
      }
      if (fs15.chown && !fs15.lchown) {
        fs15.lchown = function(path16, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs15.lchownSync = function() {
        };
      }
      if (platform2 === "win32") {
        fs15.rename = typeof fs15.rename !== "function" ? fs15.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs15.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs15.rename);
      }
      fs15.read = typeof fs15.read !== "function" ? fs15.read : (function(fs$read) {
        function read(fd, buffer2, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs15, fd, buffer2, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs15, fd, buffer2, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs15.read);
      fs15.readSync = typeof fs15.readSync !== "function" ? fs15.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer2, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs15, fd, buffer2, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs15.readSync);
      function patchLchmod(fs16) {
        fs16.lchmod = function(path16, mode, callback) {
          fs16.open(
            path16,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs16.fchmod(fd, mode, function(err2) {
                fs16.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs16.lchmodSync = function(path16, mode) {
          var fd = fs16.openSync(path16, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs16.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs16.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs16.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs16) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs16.futimes) {
          fs16.lutimes = function(path16, at, mt, cb) {
            fs16.open(path16, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs16.futimes(fd, at, mt, function(er2) {
                fs16.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs16.lutimesSync = function(path16, at, mt) {
            var fd = fs16.openSync(path16, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs16.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs16.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs16.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs16.futimes) {
          fs16.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs16.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs15, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs15, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs15, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs15, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs15, target, options, callback) : orig.call(fs15, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs15, target, options) : orig.call(fs15, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs15) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path16, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path16, options);
        Stream.call(this);
        var self2 = this;
        this.path = path16;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self2._read();
          });
          return;
        }
        fs15.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self2.emit("error", err);
            self2.readable = false;
            return;
          }
          self2.fd = fd;
          self2.emit("open", fd);
          self2._read();
        });
      }
      function WriteStream(path16, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path16, options);
        Stream.call(this);
        this.path = path16;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs15.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs15 = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs15[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs15, queue);
      fs15.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs15, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs15.close);
      fs15.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs15, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs15.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs15[gracefulQueue]);
          require("assert").equal(fs15[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs15[gracefulQueue]);
    }
    module2.exports = patch(clone(fs15));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs15.__patched) {
      module2.exports = patch(fs15);
      fs15.__patched = true;
    }
    function patch(fs16) {
      polyfills(fs16);
      fs16.gracefulify = patch;
      fs16.createReadStream = createReadStream;
      fs16.createWriteStream = createWriteStream3;
      var fs$readFile = fs16.readFile;
      fs16.readFile = readFile;
      function readFile(path16, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path16, options, cb);
        function go$readFile(path17, options2, cb2, startTime) {
          return fs$readFile(path17, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path17, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs16.writeFile;
      fs16.writeFile = writeFile;
      function writeFile(path16, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path16, data, options, cb);
        function go$writeFile(path17, data2, options2, cb2, startTime) {
          return fs$writeFile(path17, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path17, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs16.appendFile;
      if (fs$appendFile)
        fs16.appendFile = appendFile;
      function appendFile(path16, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path16, data, options, cb);
        function go$appendFile(path17, data2, options2, cb2, startTime) {
          return fs$appendFile(path17, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path17, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs16.copyFile;
      if (fs$copyFile)
        fs16.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs16.readdir;
      fs16.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path16, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path17, options2, cb2, startTime) {
          return fs$readdir(path17, fs$readdirCallback(
            path17,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path17, options2, cb2, startTime) {
          return fs$readdir(path17, options2, fs$readdirCallback(
            path17,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path16, options, cb);
        function fs$readdirCallback(path17, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path17, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs16);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs16.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs16.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs16, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs16, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs16, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs16, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path16, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path16, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path16, options) {
        return new fs16.ReadStream(path16, options);
      }
      function createWriteStream3(path16, options) {
        return new fs16.WriteStream(path16, options);
      }
      var fs$open = fs16.open;
      fs16.open = open;
      function open(path16, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path16, flags, mode, cb);
        function go$open(path17, flags2, mode2, cb2, startTime) {
          return fs$open(path17, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path17, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs16;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs15[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs15[gracefulQueue].length; ++i) {
        if (fs15[gracefulQueue][i].length > 2) {
          fs15[gracefulQueue][i][3] = now;
          fs15[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs15[gracefulQueue].length === 0)
        return;
      var elem = fs15[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs15[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/fs/index.js"(exports2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs15 = require_graceful_fs();
    var api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchmod",
      "lchown",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs15[key] === "function";
    });
    Object.assign(exports2, fs15);
    api.forEach((method) => {
      exports2[method] = u(fs15[method]);
    });
    exports2.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs15.exists(filename, callback);
      }
      return new Promise((resolve5) => {
        return fs15.exists(filename, resolve5);
      });
    };
    exports2.read = function(fd, buffer2, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs15.read(fd, buffer2, offset, length, position, callback);
      }
      return new Promise((resolve5, reject) => {
        fs15.read(fd, buffer2, offset, length, position, (err, bytesRead, buffer3) => {
          if (err) return reject(err);
          resolve5({ bytesRead, buffer: buffer3 });
        });
      });
    };
    exports2.write = function(fd, buffer2, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs15.write(fd, buffer2, ...args);
      }
      return new Promise((resolve5, reject) => {
        fs15.write(fd, buffer2, ...args, (err, bytesWritten, buffer3) => {
          if (err) return reject(err);
          resolve5({ bytesWritten, buffer: buffer3 });
        });
      });
    };
    if (typeof fs15.writev === "function") {
      exports2.writev = function(fd, buffers, ...args) {
        if (typeof args[args.length - 1] === "function") {
          return fs15.writev(fd, buffers, ...args);
        }
        return new Promise((resolve5, reject) => {
          fs15.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
            if (err) return reject(err);
            resolve5({ bytesWritten, buffers: buffers2 });
          });
        });
      };
    }
    if (typeof fs15.realpath.native === "function") {
      exports2.realpath.native = u(fs15.realpath.native);
    } else {
      process.emitWarning(
        "fs.realpath.native is not a function. Is fs being monkey-patched?",
        "Warning",
        "fs-extra-WARN0003"
      );
    }
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/mkdirs/utils.js"(exports2, module2) {
    "use strict";
    var path16 = require("path");
    module2.exports.checkPath = function checkPath(pth) {
      if (process.platform === "win32") {
        const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path16.parse(pth).root, ""));
        if (pathHasInvalidWinCharacters) {
          const error = new Error(`Path contains invalid characters: ${pth}`);
          error.code = "EINVAL";
          throw error;
        }
      }
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/mkdirs/make-dir.js"(exports2, module2) {
    "use strict";
    var fs15 = require_fs();
    var { checkPath } = require_utils();
    var getMode = (options) => {
      const defaults = { mode: 511 };
      if (typeof options === "number") return options;
      return { ...defaults, ...options }.mode;
    };
    module2.exports.makeDir = async (dir, options) => {
      checkPath(dir);
      return fs15.mkdir(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
    module2.exports.makeDirSync = (dir, options) => {
      checkPath(dir);
      return fs15.mkdirSync(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/mkdirs/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var { makeDir: _makeDir, makeDirSync } = require_make_dir();
    var makeDir = u(_makeDir);
    module2.exports = {
      mkdirs: makeDir,
      mkdirsSync: makeDirSync,
      // alias
      mkdirp: makeDir,
      mkdirpSync: makeDirSync,
      ensureDir: makeDir,
      ensureDirSync: makeDirSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/path-exists/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs15 = require_fs();
    function pathExists(path16) {
      return fs15.access(path16).then(() => true).catch(() => false);
    }
    module2.exports = {
      pathExists: u(pathExists),
      pathExistsSync: fs15.existsSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/util/utimes.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    function utimesMillis(path16, atime, mtime, callback) {
      fs15.open(path16, "r+", (err, fd) => {
        if (err) return callback(err);
        fs15.futimes(fd, atime, mtime, (futimesErr) => {
          fs15.close(fd, (closeErr) => {
            if (callback) callback(futimesErr || closeErr);
          });
        });
      });
    }
    function utimesMillisSync(path16, atime, mtime) {
      const fd = fs15.openSync(path16, "r+");
      fs15.futimesSync(fd, atime, mtime);
      return fs15.closeSync(fd);
    }
    module2.exports = {
      utimesMillis,
      utimesMillisSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/util/stat.js"(exports2, module2) {
    "use strict";
    var fs15 = require_fs();
    var path16 = require("path");
    var util = require("util");
    function getStats(src, dest, opts) {
      const statFunc = opts.dereference ? (file) => fs15.stat(file, { bigint: true }) : (file) => fs15.lstat(file, { bigint: true });
      return Promise.all([
        statFunc(src),
        statFunc(dest).catch((err) => {
          if (err.code === "ENOENT") return null;
          throw err;
        })
      ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
    }
    function getStatsSync(src, dest, opts) {
      let destStat;
      const statFunc = opts.dereference ? (file) => fs15.statSync(file, { bigint: true }) : (file) => fs15.lstatSync(file, { bigint: true });
      const srcStat = statFunc(src);
      try {
        destStat = statFunc(dest);
      } catch (err) {
        if (err.code === "ENOENT") return { srcStat, destStat: null };
        throw err;
      }
      return { srcStat, destStat };
    }
    function checkPaths(src, dest, funcName, opts, cb) {
      util.callbackify(getStats)(src, dest, opts, (err, stats) => {
        if (err) return cb(err);
        const { srcStat, destStat } = stats;
        if (destStat) {
          if (areIdentical(srcStat, destStat)) {
            const srcBaseName = path16.basename(src);
            const destBaseName = path16.basename(dest);
            if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
              return cb(null, { srcStat, destStat, isChangingCase: true });
            }
            return cb(new Error("Source and destination must not be the same."));
          }
          if (srcStat.isDirectory() && !destStat.isDirectory()) {
            return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
          }
          if (!srcStat.isDirectory() && destStat.isDirectory()) {
            return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`));
          }
        }
        if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return cb(null, { srcStat, destStat });
      });
    }
    function checkPathsSync(src, dest, funcName, opts) {
      const { srcStat, destStat } = getStatsSync(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path16.basename(src);
          const destBaseName = path16.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    function checkParentPaths(src, srcStat, dest, funcName, cb) {
      const srcParent = path16.resolve(path16.dirname(src));
      const destParent = path16.resolve(path16.dirname(dest));
      if (destParent === srcParent || destParent === path16.parse(destParent).root) return cb();
      fs15.stat(destParent, { bigint: true }, (err, destStat) => {
        if (err) {
          if (err.code === "ENOENT") return cb();
          return cb(err);
        }
        if (areIdentical(srcStat, destStat)) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return checkParentPaths(src, srcStat, destParent, funcName, cb);
      });
    }
    function checkParentPathsSync(src, srcStat, dest, funcName) {
      const srcParent = path16.resolve(path16.dirname(src));
      const destParent = path16.resolve(path16.dirname(dest));
      if (destParent === srcParent || destParent === path16.parse(destParent).root) return;
      let destStat;
      try {
        destStat = fs15.statSync(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPathsSync(src, srcStat, destParent, funcName);
    }
    function areIdentical(srcStat, destStat) {
      return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
    }
    function isSrcSubdir(src, dest) {
      const srcArr = path16.resolve(src).split(path16.sep).filter((i) => i);
      const destArr = path16.resolve(dest).split(path16.sep).filter((i) => i);
      return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
    }
    function errMsg(src, dest, funcName) {
      return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
    }
    module2.exports = {
      checkPaths,
      checkPathsSync,
      checkParentPaths,
      checkParentPathsSync,
      isSrcSubdir,
      areIdentical
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/copy/copy.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    var path16 = require("path");
    var mkdirs = require_mkdirs().mkdirs;
    var pathExists = require_path_exists().pathExists;
    var utimesMillis = require_utimes().utimesMillis;
    var stat = require_stat();
    function copy(src, dest, opts, cb) {
      if (typeof opts === "function" && !cb) {
        cb = opts;
        opts = {};
      } else if (typeof opts === "function") {
        opts = { filter: opts };
      }
      cb = cb || function() {
      };
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0001"
        );
      }
      stat.checkPaths(src, dest, "copy", opts, (err, stats) => {
        if (err) return cb(err);
        const { srcStat, destStat } = stats;
        stat.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
          if (err2) return cb(err2);
          if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
          return checkParentDir(destStat, src, dest, opts, cb);
        });
      });
    }
    function checkParentDir(destStat, src, dest, opts, cb) {
      const destParent = path16.dirname(dest);
      pathExists(destParent, (err, dirExists) => {
        if (err) return cb(err);
        if (dirExists) return getStats(destStat, src, dest, opts, cb);
        mkdirs(destParent, (err2) => {
          if (err2) return cb(err2);
          return getStats(destStat, src, dest, opts, cb);
        });
      });
    }
    function handleFilter(onInclude, destStat, src, dest, opts, cb) {
      Promise.resolve(opts.filter(src, dest)).then((include) => {
        if (include) return onInclude(destStat, src, dest, opts, cb);
        return cb();
      }, (error) => cb(error));
    }
    function startCopy(destStat, src, dest, opts, cb) {
      if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb);
      return getStats(destStat, src, dest, opts, cb);
    }
    function getStats(destStat, src, dest, opts, cb) {
      const stat2 = opts.dereference ? fs15.stat : fs15.lstat;
      stat2(src, (err, srcStat) => {
        if (err) return cb(err);
        if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb);
        else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb);
        else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb);
        else if (srcStat.isSocket()) return cb(new Error(`Cannot copy a socket file: ${src}`));
        else if (srcStat.isFIFO()) return cb(new Error(`Cannot copy a FIFO pipe: ${src}`));
        return cb(new Error(`Unknown file: ${src}`));
      });
    }
    function onFile(srcStat, destStat, src, dest, opts, cb) {
      if (!destStat) return copyFile(srcStat, src, dest, opts, cb);
      return mayCopyFile(srcStat, src, dest, opts, cb);
    }
    function mayCopyFile(srcStat, src, dest, opts, cb) {
      if (opts.overwrite) {
        fs15.unlink(dest, (err) => {
          if (err) return cb(err);
          return copyFile(srcStat, src, dest, opts, cb);
        });
      } else if (opts.errorOnExist) {
        return cb(new Error(`'${dest}' already exists`));
      } else return cb();
    }
    function copyFile(srcStat, src, dest, opts, cb) {
      fs15.copyFile(src, dest, (err) => {
        if (err) return cb(err);
        if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src, dest, cb);
        return setDestMode(dest, srcStat.mode, cb);
      });
    }
    function handleTimestampsAndMode(srcMode, src, dest, cb) {
      if (fileIsNotWritable(srcMode)) {
        return makeFileWritable(dest, srcMode, (err) => {
          if (err) return cb(err);
          return setDestTimestampsAndMode(srcMode, src, dest, cb);
        });
      }
      return setDestTimestampsAndMode(srcMode, src, dest, cb);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode, cb) {
      return setDestMode(dest, srcMode | 128, cb);
    }
    function setDestTimestampsAndMode(srcMode, src, dest, cb) {
      setDestTimestamps(src, dest, (err) => {
        if (err) return cb(err);
        return setDestMode(dest, srcMode, cb);
      });
    }
    function setDestMode(dest, srcMode, cb) {
      return fs15.chmod(dest, srcMode, cb);
    }
    function setDestTimestamps(src, dest, cb) {
      fs15.stat(src, (err, updatedSrcStat) => {
        if (err) return cb(err);
        return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb);
      });
    }
    function onDir(srcStat, destStat, src, dest, opts, cb) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts, cb);
      return copyDir(src, dest, opts, cb);
    }
    function mkDirAndCopy(srcMode, src, dest, opts, cb) {
      fs15.mkdir(dest, (err) => {
        if (err) return cb(err);
        copyDir(src, dest, opts, (err2) => {
          if (err2) return cb(err2);
          return setDestMode(dest, srcMode, cb);
        });
      });
    }
    function copyDir(src, dest, opts, cb) {
      fs15.readdir(src, (err, items) => {
        if (err) return cb(err);
        return copyDirItems(items, src, dest, opts, cb);
      });
    }
    function copyDirItems(items, src, dest, opts, cb) {
      const item = items.pop();
      if (!item) return cb();
      return copyDirItem(items, item, src, dest, opts, cb);
    }
    function copyDirItem(items, item, src, dest, opts, cb) {
      const srcItem = path16.join(src, item);
      const destItem = path16.join(dest, item);
      stat.checkPaths(srcItem, destItem, "copy", opts, (err, stats) => {
        if (err) return cb(err);
        const { destStat } = stats;
        startCopy(destStat, srcItem, destItem, opts, (err2) => {
          if (err2) return cb(err2);
          return copyDirItems(items, src, dest, opts, cb);
        });
      });
    }
    function onLink(destStat, src, dest, opts, cb) {
      fs15.readlink(src, (err, resolvedSrc) => {
        if (err) return cb(err);
        if (opts.dereference) {
          resolvedSrc = path16.resolve(process.cwd(), resolvedSrc);
        }
        if (!destStat) {
          return fs15.symlink(resolvedSrc, dest, cb);
        } else {
          fs15.readlink(dest, (err2, resolvedDest) => {
            if (err2) {
              if (err2.code === "EINVAL" || err2.code === "UNKNOWN") return fs15.symlink(resolvedSrc, dest, cb);
              return cb(err2);
            }
            if (opts.dereference) {
              resolvedDest = path16.resolve(process.cwd(), resolvedDest);
            }
            if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
              return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
            }
            if (destStat.isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
              return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
            }
            return copyLink(resolvedSrc, dest, cb);
          });
        }
      });
    }
    function copyLink(resolvedSrc, dest, cb) {
      fs15.unlink(dest, (err) => {
        if (err) return cb(err);
        return fs15.symlink(resolvedSrc, dest, cb);
      });
    }
    module2.exports = copy;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/copy/copy-sync.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    var path16 = require("path");
    var mkdirsSync = require_mkdirs().mkdirsSync;
    var utimesMillisSync = require_utimes().utimesMillisSync;
    var stat = require_stat();
    function copySync(src, dest, opts) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0002"
        );
      }
      const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "copy");
      return handleFilterAndCopy(destStat, src, dest, opts);
    }
    function handleFilterAndCopy(destStat, src, dest, opts) {
      if (opts.filter && !opts.filter(src, dest)) return;
      const destParent = path16.dirname(dest);
      if (!fs15.existsSync(destParent)) mkdirsSync(destParent);
      return getStats(destStat, src, dest, opts);
    }
    function startCopy(destStat, src, dest, opts) {
      if (opts.filter && !opts.filter(src, dest)) return;
      return getStats(destStat, src, dest, opts);
    }
    function getStats(destStat, src, dest, opts) {
      const statSync4 = opts.dereference ? fs15.statSync : fs15.lstatSync;
      const srcStat = statSync4(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      return mayCopyFile(srcStat, src, dest, opts);
    }
    function mayCopyFile(srcStat, src, dest, opts) {
      if (opts.overwrite) {
        fs15.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
      } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    function copyFile(srcStat, src, dest, opts) {
      fs15.copyFileSync(src, dest);
      if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
      return setDestMode(dest, srcStat.mode);
    }
    function handleTimestamps(srcMode, src, dest) {
      if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
      return setDestTimestamps(src, dest);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return setDestMode(dest, srcMode | 128);
    }
    function setDestMode(dest, srcMode) {
      return fs15.chmodSync(dest, srcMode);
    }
    function setDestTimestamps(src, dest) {
      const updatedSrcStat = fs15.statSync(src);
      return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
    }
    function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
      return copyDir(src, dest, opts);
    }
    function mkDirAndCopy(srcMode, src, dest, opts) {
      fs15.mkdirSync(dest);
      copyDir(src, dest, opts);
      return setDestMode(dest, srcMode);
    }
    function copyDir(src, dest, opts) {
      fs15.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
    }
    function copyDirItem(item, src, dest, opts) {
      const srcItem = path16.join(src, item);
      const destItem = path16.join(dest, item);
      const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy", opts);
      return startCopy(destStat, srcItem, destItem, opts);
    }
    function onLink(destStat, src, dest, opts) {
      let resolvedSrc = fs15.readlinkSync(src);
      if (opts.dereference) {
        resolvedSrc = path16.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs15.symlinkSync(resolvedSrc, dest);
      } else {
        let resolvedDest;
        try {
          resolvedDest = fs15.readlinkSync(dest);
        } catch (err) {
          if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs15.symlinkSync(resolvedSrc, dest);
          throw err;
        }
        if (opts.dereference) {
          resolvedDest = path16.resolve(process.cwd(), resolvedDest);
        }
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
        }
        if (fs15.statSync(dest).isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
        }
        return copyLink(resolvedSrc, dest);
      }
    }
    function copyLink(resolvedSrc, dest) {
      fs15.unlinkSync(dest);
      return fs15.symlinkSync(resolvedSrc, dest);
    }
    module2.exports = copySync;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/copy/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    module2.exports = {
      copy: u(require_copy()),
      copySync: require_copy_sync()
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/remove/rimraf.js
var require_rimraf = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/remove/rimraf.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    var path16 = require("path");
    var assert = require("assert");
    var isWindows = process.platform === "win32";
    function defaults(options) {
      const methods = [
        "unlink",
        "chmod",
        "stat",
        "lstat",
        "rmdir",
        "readdir"
      ];
      methods.forEach((m) => {
        options[m] = options[m] || fs15[m];
        m = m + "Sync";
        options[m] = options[m] || fs15[m];
      });
      options.maxBusyTries = options.maxBusyTries || 3;
    }
    function rimraf(p, options, cb) {
      let busyTries = 0;
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      assert(p, "rimraf: missing path");
      assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
      assert.strictEqual(typeof cb, "function", "rimraf: callback function required");
      assert(options, "rimraf: invalid options argument provided");
      assert.strictEqual(typeof options, "object", "rimraf: options should be object");
      defaults(options);
      rimraf_(p, options, function CB(er) {
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") && busyTries < options.maxBusyTries) {
            busyTries++;
            const time = busyTries * 100;
            return setTimeout(() => rimraf_(p, options, CB), time);
          }
          if (er.code === "ENOENT") er = null;
        }
        cb(er);
      });
    }
    function rimraf_(p, options, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.lstat(p, (er, st) => {
        if (er && er.code === "ENOENT") {
          return cb(null);
        }
        if (er && er.code === "EPERM" && isWindows) {
          return fixWinEPERM(p, options, er, cb);
        }
        if (st && st.isDirectory()) {
          return rmdir(p, options, er, cb);
        }
        options.unlink(p, (er2) => {
          if (er2) {
            if (er2.code === "ENOENT") {
              return cb(null);
            }
            if (er2.code === "EPERM") {
              return isWindows ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
            }
            if (er2.code === "EISDIR") {
              return rmdir(p, options, er2, cb);
            }
          }
          return cb(er2);
        });
      });
    }
    function fixWinEPERM(p, options, er, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.chmod(p, 438, (er2) => {
        if (er2) {
          cb(er2.code === "ENOENT" ? null : er);
        } else {
          options.stat(p, (er3, stats) => {
            if (er3) {
              cb(er3.code === "ENOENT" ? null : er);
            } else if (stats.isDirectory()) {
              rmdir(p, options, er, cb);
            } else {
              options.unlink(p, cb);
            }
          });
        }
      });
    }
    function fixWinEPERMSync(p, options, er) {
      let stats;
      assert(p);
      assert(options);
      try {
        options.chmodSync(p, 438);
      } catch (er2) {
        if (er2.code === "ENOENT") {
          return;
        } else {
          throw er;
        }
      }
      try {
        stats = options.statSync(p);
      } catch (er3) {
        if (er3.code === "ENOENT") {
          return;
        } else {
          throw er;
        }
      }
      if (stats.isDirectory()) {
        rmdirSync(p, options, er);
      } else {
        options.unlinkSync(p);
      }
    }
    function rmdir(p, options, originalEr, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.rmdir(p, (er) => {
        if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
          rmkids(p, options, cb);
        } else if (er && er.code === "ENOTDIR") {
          cb(originalEr);
        } else {
          cb(er);
        }
      });
    }
    function rmkids(p, options, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.readdir(p, (er, files) => {
        if (er) return cb(er);
        let n = files.length;
        let errState;
        if (n === 0) return options.rmdir(p, cb);
        files.forEach((f) => {
          rimraf(path16.join(p, f), options, (er2) => {
            if (errState) {
              return;
            }
            if (er2) return cb(errState = er2);
            if (--n === 0) {
              options.rmdir(p, cb);
            }
          });
        });
      });
    }
    function rimrafSync(p, options) {
      let st;
      options = options || {};
      defaults(options);
      assert(p, "rimraf: missing path");
      assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
      assert(options, "rimraf: missing options");
      assert.strictEqual(typeof options, "object", "rimraf: options should be object");
      try {
        st = options.lstatSync(p);
      } catch (er) {
        if (er.code === "ENOENT") {
          return;
        }
        if (er.code === "EPERM" && isWindows) {
          fixWinEPERMSync(p, options, er);
        }
      }
      try {
        if (st && st.isDirectory()) {
          rmdirSync(p, options, null);
        } else {
          options.unlinkSync(p);
        }
      } catch (er) {
        if (er.code === "ENOENT") {
          return;
        } else if (er.code === "EPERM") {
          return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
        } else if (er.code !== "EISDIR") {
          throw er;
        }
        rmdirSync(p, options, er);
      }
    }
    function rmdirSync(p, options, originalEr) {
      assert(p);
      assert(options);
      try {
        options.rmdirSync(p);
      } catch (er) {
        if (er.code === "ENOTDIR") {
          throw originalEr;
        } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
          rmkidsSync(p, options);
        } else if (er.code !== "ENOENT") {
          throw er;
        }
      }
    }
    function rmkidsSync(p, options) {
      assert(p);
      assert(options);
      options.readdirSync(p).forEach((f) => rimrafSync(path16.join(p, f), options));
      if (isWindows) {
        const startTime = Date.now();
        do {
          try {
            const ret = options.rmdirSync(p, options);
            return ret;
          } catch {
          }
        } while (Date.now() - startTime < 500);
      } else {
        const ret = options.rmdirSync(p, options);
        return ret;
      }
    }
    module2.exports = rimraf;
    rimraf.sync = rimrafSync;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/remove/index.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    var u = require_universalify().fromCallback;
    var rimraf = require_rimraf();
    function remove(path16, callback) {
      if (fs15.rm) return fs15.rm(path16, { recursive: true, force: true }, callback);
      rimraf(path16, callback);
    }
    function removeSync(path16) {
      if (fs15.rmSync) return fs15.rmSync(path16, { recursive: true, force: true });
      rimraf.sync(path16);
    }
    module2.exports = {
      remove: u(remove),
      removeSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/empty/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs15 = require_fs();
    var path16 = require("path");
    var mkdir = require_mkdirs();
    var remove = require_remove();
    var emptyDir = u(async function emptyDir2(dir) {
      let items;
      try {
        items = await fs15.readdir(dir);
      } catch {
        return mkdir.mkdirs(dir);
      }
      return Promise.all(items.map((item) => remove.remove(path16.join(dir, item))));
    });
    function emptyDirSync(dir) {
      let items;
      try {
        items = fs15.readdirSync(dir);
      } catch {
        return mkdir.mkdirsSync(dir);
      }
      items.forEach((item) => {
        item = path16.join(dir, item);
        remove.removeSync(item);
      });
    }
    module2.exports = {
      emptyDirSync,
      emptydirSync: emptyDirSync,
      emptyDir,
      emptydir: emptyDir
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/ensure/file.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path16 = require("path");
    var fs15 = require_graceful_fs();
    var mkdir = require_mkdirs();
    function createFile(file, callback) {
      function makeFile() {
        fs15.writeFile(file, "", (err) => {
          if (err) return callback(err);
          callback();
        });
      }
      fs15.stat(file, (err, stats) => {
        if (!err && stats.isFile()) return callback();
        const dir = path16.dirname(file);
        fs15.stat(dir, (err2, stats2) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return mkdir.mkdirs(dir, (err3) => {
                if (err3) return callback(err3);
                makeFile();
              });
            }
            return callback(err2);
          }
          if (stats2.isDirectory()) makeFile();
          else {
            fs15.readdir(dir, (err3) => {
              if (err3) return callback(err3);
            });
          }
        });
      });
    }
    function createFileSync(file) {
      let stats;
      try {
        stats = fs15.statSync(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path16.dirname(file);
      try {
        if (!fs15.statSync(dir).isDirectory()) {
          fs15.readdirSync(dir);
        }
      } catch (err) {
        if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
        else throw err;
      }
      fs15.writeFileSync(file, "");
    }
    module2.exports = {
      createFile: u(createFile),
      createFileSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/ensure/link.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path16 = require("path");
    var fs15 = require_graceful_fs();
    var mkdir = require_mkdirs();
    var pathExists = require_path_exists().pathExists;
    var { areIdentical } = require_stat();
    function createLink(srcpath, dstpath, callback) {
      function makeLink(srcpath2, dstpath2) {
        fs15.link(srcpath2, dstpath2, (err) => {
          if (err) return callback(err);
          callback(null);
        });
      }
      fs15.lstat(dstpath, (_, dstStat) => {
        fs15.lstat(srcpath, (err, srcStat) => {
          if (err) {
            err.message = err.message.replace("lstat", "ensureLink");
            return callback(err);
          }
          if (dstStat && areIdentical(srcStat, dstStat)) return callback(null);
          const dir = path16.dirname(dstpath);
          pathExists(dir, (err2, dirExists) => {
            if (err2) return callback(err2);
            if (dirExists) return makeLink(srcpath, dstpath);
            mkdir.mkdirs(dir, (err3) => {
              if (err3) return callback(err3);
              makeLink(srcpath, dstpath);
            });
          });
        });
      });
    }
    function createLinkSync(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = fs15.lstatSync(dstpath);
      } catch {
      }
      try {
        const srcStat = fs15.lstatSync(srcpath);
        if (dstStat && areIdentical(srcStat, dstStat)) return;
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      const dir = path16.dirname(dstpath);
      const dirExists = fs15.existsSync(dir);
      if (dirExists) return fs15.linkSync(srcpath, dstpath);
      mkdir.mkdirsSync(dir);
      return fs15.linkSync(srcpath, dstpath);
    }
    module2.exports = {
      createLink: u(createLink),
      createLinkSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/ensure/symlink-paths.js"(exports2, module2) {
    "use strict";
    var path16 = require("path");
    var fs15 = require_graceful_fs();
    var pathExists = require_path_exists().pathExists;
    function symlinkPaths(srcpath, dstpath, callback) {
      if (path16.isAbsolute(srcpath)) {
        return fs15.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace("lstat", "ensureSymlink");
            return callback(err);
          }
          return callback(null, {
            toCwd: srcpath,
            toDst: srcpath
          });
        });
      } else {
        const dstdir = path16.dirname(dstpath);
        const relativeToDst = path16.join(dstdir, srcpath);
        return pathExists(relativeToDst, (err, exists) => {
          if (err) return callback(err);
          if (exists) {
            return callback(null, {
              toCwd: relativeToDst,
              toDst: srcpath
            });
          } else {
            return fs15.lstat(srcpath, (err2) => {
              if (err2) {
                err2.message = err2.message.replace("lstat", "ensureSymlink");
                return callback(err2);
              }
              return callback(null, {
                toCwd: srcpath,
                toDst: path16.relative(dstdir, srcpath)
              });
            });
          }
        });
      }
    }
    function symlinkPathsSync(srcpath, dstpath) {
      let exists;
      if (path16.isAbsolute(srcpath)) {
        exists = fs15.existsSync(srcpath);
        if (!exists) throw new Error("absolute srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      } else {
        const dstdir = path16.dirname(dstpath);
        const relativeToDst = path16.join(dstdir, srcpath);
        exists = fs15.existsSync(relativeToDst);
        if (exists) {
          return {
            toCwd: relativeToDst,
            toDst: srcpath
          };
        } else {
          exists = fs15.existsSync(srcpath);
          if (!exists) throw new Error("relative srcpath does not exist");
          return {
            toCwd: srcpath,
            toDst: path16.relative(dstdir, srcpath)
          };
        }
      }
    }
    module2.exports = {
      symlinkPaths,
      symlinkPathsSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/ensure/symlink-type.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    function symlinkType(srcpath, type, callback) {
      callback = typeof type === "function" ? type : callback;
      type = typeof type === "function" ? false : type;
      if (type) return callback(null, type);
      fs15.lstat(srcpath, (err, stats) => {
        if (err) return callback(null, "file");
        type = stats && stats.isDirectory() ? "dir" : "file";
        callback(null, type);
      });
    }
    function symlinkTypeSync(srcpath, type) {
      let stats;
      if (type) return type;
      try {
        stats = fs15.lstatSync(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    module2.exports = {
      symlinkType,
      symlinkTypeSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/ensure/symlink.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path16 = require("path");
    var fs15 = require_fs();
    var _mkdirs = require_mkdirs();
    var mkdirs = _mkdirs.mkdirs;
    var mkdirsSync = _mkdirs.mkdirsSync;
    var _symlinkPaths = require_symlink_paths();
    var symlinkPaths = _symlinkPaths.symlinkPaths;
    var symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
    var _symlinkType = require_symlink_type();
    var symlinkType = _symlinkType.symlinkType;
    var symlinkTypeSync = _symlinkType.symlinkTypeSync;
    var pathExists = require_path_exists().pathExists;
    var { areIdentical } = require_stat();
    function createSymlink(srcpath, dstpath, type, callback) {
      callback = typeof type === "function" ? type : callback;
      type = typeof type === "function" ? false : type;
      fs15.lstat(dstpath, (err, stats) => {
        if (!err && stats.isSymbolicLink()) {
          Promise.all([
            fs15.stat(srcpath),
            fs15.stat(dstpath)
          ]).then(([srcStat, dstStat]) => {
            if (areIdentical(srcStat, dstStat)) return callback(null);
            _createSymlink(srcpath, dstpath, type, callback);
          });
        } else _createSymlink(srcpath, dstpath, type, callback);
      });
    }
    function _createSymlink(srcpath, dstpath, type, callback) {
      symlinkPaths(srcpath, dstpath, (err, relative) => {
        if (err) return callback(err);
        srcpath = relative.toDst;
        symlinkType(relative.toCwd, type, (err2, type2) => {
          if (err2) return callback(err2);
          const dir = path16.dirname(dstpath);
          pathExists(dir, (err3, dirExists) => {
            if (err3) return callback(err3);
            if (dirExists) return fs15.symlink(srcpath, dstpath, type2, callback);
            mkdirs(dir, (err4) => {
              if (err4) return callback(err4);
              fs15.symlink(srcpath, dstpath, type2, callback);
            });
          });
        });
      });
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      let stats;
      try {
        stats = fs15.lstatSync(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const srcStat = fs15.statSync(srcpath);
        const dstStat = fs15.statSync(dstpath);
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative.toDst;
      type = symlinkTypeSync(relative.toCwd, type);
      const dir = path16.dirname(dstpath);
      const exists = fs15.existsSync(dir);
      if (exists) return fs15.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs15.symlinkSync(srcpath, dstpath, type);
    }
    module2.exports = {
      createSymlink: u(createSymlink),
      createSymlinkSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/ensure/index.js"(exports2, module2) {
    "use strict";
    var { createFile, createFileSync } = require_file();
    var { createLink, createLinkSync } = require_link();
    var { createSymlink, createSymlinkSync } = require_symlink();
    module2.exports = {
      // file
      createFile,
      createFileSync,
      ensureFile: createFile,
      ensureFileSync: createFileSync,
      // link
      createLink,
      createLinkSync,
      ensureLink: createLink,
      ensureLinkSync: createLinkSync,
      // symlink
      createSymlink,
      createSymlinkSync,
      ensureSymlink: createSymlink,
      ensureSymlinkSync: createSymlinkSync
    };
  }
});

// node_modules/electron-updater/node_modules/jsonfile/utils.js
var require_utils2 = __commonJS({
  "node_modules/electron-updater/node_modules/jsonfile/utils.js"(exports2, module2) {
    function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
      const EOF = finalEOL ? EOL : "";
      const str = JSON.stringify(obj, replacer, spaces);
      return str.replace(/\n/g, EOL) + EOF;
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content)) content = content.toString("utf8");
      return content.replace(/^\uFEFF/, "");
    }
    module2.exports = { stringify, stripBom };
  }
});

// node_modules/electron-updater/node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "node_modules/electron-updater/node_modules/jsonfile/index.js"(exports2, module2) {
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    var universalify = require_universalify();
    var { stringify, stripBom } = require_utils2();
    async function _readFile(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs15 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      let data = await universalify.fromCallback(fs15.readFile)(file, options);
      data = stripBom(data);
      let obj;
      try {
        obj = JSON.parse(data, options ? options.reviver : null);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
      return obj;
    }
    var readFile = universalify.fromPromise(_readFile);
    function readFileSync14(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs15 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      try {
        let content = fs15.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
    }
    async function _writeFile(file, obj, options = {}) {
      const fs15 = options.fs || _fs;
      const str = stringify(obj, options);
      await universalify.fromCallback(fs15.writeFile)(file, str, options);
    }
    var writeFile = universalify.fromPromise(_writeFile);
    function writeFileSync11(file, obj, options = {}) {
      const fs15 = options.fs || _fs;
      const str = stringify(obj, options);
      return fs15.writeFileSync(file, str, options);
    }
    module2.exports = {
      readFile,
      readFileSync: readFileSync14,
      writeFile,
      writeFileSync: writeFileSync11
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/json/jsonfile.js"(exports2, module2) {
    "use strict";
    var jsonFile = require_jsonfile();
    module2.exports = {
      // jsonfile exports
      readJson: jsonFile.readFile,
      readJsonSync: jsonFile.readFileSync,
      writeJson: jsonFile.writeFile,
      writeJsonSync: jsonFile.writeFileSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/output-file/index.js
var require_output_file = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/output-file/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs15 = require_graceful_fs();
    var path16 = require("path");
    var mkdir = require_mkdirs();
    var pathExists = require_path_exists().pathExists;
    function outputFile(file, data, encoding, callback) {
      if (typeof encoding === "function") {
        callback = encoding;
        encoding = "utf8";
      }
      const dir = path16.dirname(file);
      pathExists(dir, (err, itDoes) => {
        if (err) return callback(err);
        if (itDoes) return fs15.writeFile(file, data, encoding, callback);
        mkdir.mkdirs(dir, (err2) => {
          if (err2) return callback(err2);
          fs15.writeFile(file, data, encoding, callback);
        });
      });
    }
    function outputFileSync(file, ...args) {
      const dir = path16.dirname(file);
      if (fs15.existsSync(dir)) {
        return fs15.writeFileSync(file, ...args);
      }
      mkdir.mkdirsSync(dir);
      fs15.writeFileSync(file, ...args);
    }
    module2.exports = {
      outputFile: u(outputFile),
      outputFileSync
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/json/output-json.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFile } = require_output_file();
    async function outputJson(file, data, options = {}) {
      const str = stringify(data, options);
      await outputFile(file, str, options);
    }
    module2.exports = outputJson;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/json/output-json-sync.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFileSync } = require_output_file();
    function outputJsonSync(file, data, options) {
      const str = stringify(data, options);
      outputFileSync(file, str, options);
    }
    module2.exports = outputJsonSync;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/json/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var jsonFile = require_jsonfile2();
    jsonFile.outputJson = u(require_output_json());
    jsonFile.outputJsonSync = require_output_json_sync();
    jsonFile.outputJSON = jsonFile.outputJson;
    jsonFile.outputJSONSync = jsonFile.outputJsonSync;
    jsonFile.writeJSON = jsonFile.writeJson;
    jsonFile.writeJSONSync = jsonFile.writeJsonSync;
    jsonFile.readJSON = jsonFile.readJson;
    jsonFile.readJSONSync = jsonFile.readJsonSync;
    module2.exports = jsonFile;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/move/move.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    var path16 = require("path");
    var copy = require_copy2().copy;
    var remove = require_remove().remove;
    var mkdirp = require_mkdirs().mkdirp;
    var pathExists = require_path_exists().pathExists;
    var stat = require_stat();
    function move(src, dest, opts, cb) {
      if (typeof opts === "function") {
        cb = opts;
        opts = {};
      }
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      stat.checkPaths(src, dest, "move", opts, (err, stats) => {
        if (err) return cb(err);
        const { srcStat, isChangingCase = false } = stats;
        stat.checkParentPaths(src, srcStat, dest, "move", (err2) => {
          if (err2) return cb(err2);
          if (isParentRoot(dest)) return doRename(src, dest, overwrite, isChangingCase, cb);
          mkdirp(path16.dirname(dest), (err3) => {
            if (err3) return cb(err3);
            return doRename(src, dest, overwrite, isChangingCase, cb);
          });
        });
      });
    }
    function isParentRoot(dest) {
      const parent = path16.dirname(dest);
      const parsedPath = path16.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase, cb) {
      if (isChangingCase) return rename(src, dest, overwrite, cb);
      if (overwrite) {
        return remove(dest, (err) => {
          if (err) return cb(err);
          return rename(src, dest, overwrite, cb);
        });
      }
      pathExists(dest, (err, destExists) => {
        if (err) return cb(err);
        if (destExists) return cb(new Error("dest already exists."));
        return rename(src, dest, overwrite, cb);
      });
    }
    function rename(src, dest, overwrite, cb) {
      fs15.rename(src, dest, (err) => {
        if (!err) return cb();
        if (err.code !== "EXDEV") return cb(err);
        return moveAcrossDevice(src, dest, overwrite, cb);
      });
    }
    function moveAcrossDevice(src, dest, overwrite, cb) {
      const opts = {
        overwrite,
        errorOnExist: true
      };
      copy(src, dest, opts, (err) => {
        if (err) return cb(err);
        return remove(src, cb);
      });
    }
    module2.exports = move;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/move/move-sync.js"(exports2, module2) {
    "use strict";
    var fs15 = require_graceful_fs();
    var path16 = require("path");
    var copySync = require_copy2().copySync;
    var removeSync = require_remove().removeSync;
    var mkdirpSync = require_mkdirs().mkdirpSync;
    var stat = require_stat();
    function moveSync(src, dest, opts) {
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "move");
      if (!isParentRoot(dest)) mkdirpSync(path16.dirname(dest));
      return doRename(src, dest, overwrite, isChangingCase);
    }
    function isParentRoot(dest) {
      const parent = path16.dirname(dest);
      const parsedPath = path16.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase) {
      if (isChangingCase) return rename(src, dest, overwrite);
      if (overwrite) {
        removeSync(dest);
        return rename(src, dest, overwrite);
      }
      if (fs15.existsSync(dest)) throw new Error("dest already exists.");
      return rename(src, dest, overwrite);
    }
    function rename(src, dest, overwrite) {
      try {
        fs15.renameSync(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") throw err;
        return moveAcrossDevice(src, dest, overwrite);
      }
    }
    function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true
      };
      copySync(src, dest, opts);
      return removeSync(src);
    }
    module2.exports = moveSync;
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/move/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    module2.exports = {
      move: u(require_move()),
      moveSync: require_move_sync()
    };
  }
});

// node_modules/electron-updater/node_modules/fs-extra/lib/index.js
var require_lib = __commonJS({
  "node_modules/electron-updater/node_modules/fs-extra/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Export promiseified graceful-fs:
      ...require_fs(),
      // Export extra methods:
      ...require_copy2(),
      ...require_empty(),
      ...require_ensure(),
      ...require_json(),
      ...require_mkdirs(),
      ...require_move2(),
      ...require_output_file(),
      ...require_path_exists(),
      ...require_remove()
    };
  }
});

// node_modules/builder-util-runtime/out/CancellationToken.js
var require_CancellationToken = __commonJS({
  "node_modules/builder-util-runtime/out/CancellationToken.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CancellationError = exports2.CancellationToken = void 0;
    var events_1 = require("events");
    var CancellationToken = class extends events_1.EventEmitter {
      get cancelled() {
        return this._cancelled || this._parent != null && this._parent.cancelled;
      }
      set parent(value) {
        this.removeParentCancelHandler();
        this._parent = value;
        this.parentCancelHandler = () => this.cancel();
        this._parent.onCancel(this.parentCancelHandler);
      }
      // babel cannot compile ... correctly for super calls
      constructor(parent) {
        super();
        this.parentCancelHandler = null;
        this._parent = null;
        this._cancelled = false;
        if (parent != null) {
          this.parent = parent;
        }
      }
      cancel() {
        this._cancelled = true;
        this.emit("cancel");
      }
      onCancel(handler) {
        if (this.cancelled) {
          handler();
        } else {
          this.once("cancel", handler);
        }
      }
      createPromise(callback) {
        if (this.cancelled) {
          return Promise.reject(new CancellationError());
        }
        const finallyHandler = () => {
          if (cancelHandler != null) {
            try {
              this.removeListener("cancel", cancelHandler);
              cancelHandler = null;
            } catch (_ignore) {
            }
          }
        };
        let cancelHandler = null;
        return new Promise((resolve5, reject) => {
          let addedCancelHandler = null;
          cancelHandler = () => {
            try {
              if (addedCancelHandler != null) {
                addedCancelHandler();
                addedCancelHandler = null;
              }
            } finally {
              reject(new CancellationError());
            }
          };
          if (this.cancelled) {
            cancelHandler();
            return;
          }
          this.onCancel(cancelHandler);
          callback(resolve5, reject, (callback2) => {
            addedCancelHandler = callback2;
          });
        }).then((it) => {
          finallyHandler();
          return it;
        }).catch((e) => {
          finallyHandler();
          throw e;
        });
      }
      removeParentCancelHandler() {
        const parent = this._parent;
        if (parent != null && this.parentCancelHandler != null) {
          parent.removeListener("cancel", this.parentCancelHandler);
          this.parentCancelHandler = null;
        }
      }
      dispose() {
        try {
          this.removeParentCancelHandler();
        } finally {
          this.removeAllListeners();
          this._parent = null;
        }
      }
    };
    exports2.CancellationToken = CancellationToken;
    var CancellationError = class extends Error {
      constructor() {
        super("cancelled");
      }
    };
    exports2.CancellationError = CancellationError;
  }
});

// node_modules/builder-util-runtime/out/error.js
var require_error = __commonJS({
  "node_modules/builder-util-runtime/out/error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.newError = newError;
    function newError(message, code) {
      const error = new Error(message);
      error.code = code;
      return error;
    }
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter3) {
        const newDebug = createDebug(this.namespace + (typeof delimiter3 === "undefined" ? ":" : delimiter3) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "node_modules/has-flag/index.js"(exports2, module2) {
    "use strict";
    module2.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "node_modules/supports-color/index.js"(exports2, module2) {
    "use strict";
    var os7 = require("os");
    var tty = require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      forceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = 1;
    }
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        forceColor = 1;
      } else if (env.FORCE_COLOR === "false") {
        forceColor = 0;
      } else {
        forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os7.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign2) => sign2 in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream, stream && stream.isTTY);
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(true, tty.isatty(1))),
      stderr: translateLevel(supportsColor(true, tty.isatty(2)))
    };
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/builder-util-runtime/out/ProgressCallbackTransform.js
var require_ProgressCallbackTransform = __commonJS({
  "node_modules/builder-util-runtime/out/ProgressCallbackTransform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgressCallbackTransform = void 0;
    var stream_1 = require("stream");
    var ProgressCallbackTransform = class extends stream_1.Transform {
      constructor(total, cancellationToken, onProgress) {
        super();
        this.total = total;
        this.cancellationToken = cancellationToken;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.transferred = 0;
        this.delta = 0;
        this.nextUpdate = this.start + 1e3;
      }
      _transform(chunk, encoding, callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"), null);
          return;
        }
        this.transferred += chunk.length;
        this.delta += chunk.length;
        const now = Date.now();
        if (now >= this.nextUpdate && this.transferred !== this.total) {
          this.nextUpdate = now + 1e3;
          this.onProgress({
            total: this.total,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.total * 100,
            bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
          });
          this.delta = 0;
        }
        callback(null, chunk);
      }
      _flush(callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"));
          return;
        }
        this.onProgress({
          total: this.total,
          delta: this.delta,
          transferred: this.total,
          percent: 100,
          bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
        });
        this.delta = 0;
        callback(null);
      }
    };
    exports2.ProgressCallbackTransform = ProgressCallbackTransform;
  }
});

// node_modules/builder-util-runtime/out/httpExecutor.js
var require_httpExecutor = __commonJS({
  "node_modules/builder-util-runtime/out/httpExecutor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DigestTransform = exports2.HttpExecutor = exports2.HttpError = void 0;
    exports2.createHttpError = createHttpError;
    exports2.parseJson = parseJson;
    exports2.configureRequestOptionsFromUrl = configureRequestOptionsFromUrl;
    exports2.configureRequestUrl = configureRequestUrl;
    exports2.safeGetHeader = safeGetHeader;
    exports2.configureRequestOptions = configureRequestOptions;
    exports2.safeStringifyJson = safeStringifyJson;
    var crypto_1 = require("crypto");
    var debug_1 = require_src();
    var fs_1 = require("fs");
    var stream_1 = require("stream");
    var url_1 = require("url");
    var CancellationToken_1 = require_CancellationToken();
    var error_1 = require_error();
    var ProgressCallbackTransform_1 = require_ProgressCallbackTransform();
    var debug = (0, debug_1.default)("electron-builder");
    function createHttpError(response, description = null) {
      return new HttpError(response.statusCode || -1, `${response.statusCode} ${response.statusMessage}` + (description == null ? "" : "\n" + JSON.stringify(description, null, "  ")) + "\nHeaders: " + safeStringifyJson(response.headers), description);
    }
    var HTTP_STATUS_CODES = /* @__PURE__ */ new Map([
      [429, "Too many requests"],
      [400, "Bad request"],
      [403, "Forbidden"],
      [404, "Not found"],
      [405, "Method not allowed"],
      [406, "Not acceptable"],
      [408, "Request timeout"],
      [413, "Request entity too large"],
      [500, "Internal server error"],
      [502, "Bad gateway"],
      [503, "Service unavailable"],
      [504, "Gateway timeout"],
      [505, "HTTP version not supported"]
    ]);
    var HttpError = class extends Error {
      constructor(statusCode, message = `HTTP error: ${HTTP_STATUS_CODES.get(statusCode) || statusCode}`, description = null) {
        super(message);
        this.statusCode = statusCode;
        this.description = description;
        this.name = "HttpError";
        this.code = `HTTP_ERROR_${statusCode}`;
      }
      isServerError() {
        return this.statusCode >= 500 && this.statusCode <= 599;
      }
    };
    exports2.HttpError = HttpError;
    function parseJson(result) {
      return result.then((it) => it == null || it.length === 0 ? null : JSON.parse(it));
    }
    var HttpExecutor = class _HttpExecutor {
      constructor() {
        this.maxRedirects = 10;
      }
      request(options, cancellationToken = new CancellationToken_1.CancellationToken(), data) {
        configureRequestOptions(options);
        const json = data == null ? void 0 : JSON.stringify(data);
        const encodedData = json ? Buffer.from(json) : void 0;
        if (encodedData != null) {
          debug(json);
          const { headers, ...opts } = options;
          options = {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": encodedData.length,
              ...headers
            },
            ...opts
          };
        }
        return this.doApiRequest(options, cancellationToken, (it) => it.end(encodedData));
      }
      doApiRequest(options, cancellationToken, requestProcessor, redirectCount = 0) {
        if (debug.enabled) {
          debug(`Request: ${safeStringifyJson(options)}`);
        }
        return cancellationToken.createPromise((resolve5, reject, onCancel) => {
          const request = this.createRequest(options, (response) => {
            try {
              this.handleResponse(response, options, cancellationToken, resolve5, reject, redirectCount, requestProcessor);
            } catch (e) {
              reject(e);
            }
          });
          this.addErrorAndTimeoutHandlers(request, reject, options.timeout);
          this.addRedirectHandlers(request, options, reject, redirectCount, (options2) => {
            this.doApiRequest(options2, cancellationToken, requestProcessor, redirectCount).then(resolve5).catch(reject);
          });
          requestProcessor(request, reject);
          onCancel(() => request.abort());
        });
      }
      // noinspection JSUnusedLocalSymbols
      // eslint-disable-next-line
      addRedirectHandlers(request, options, reject, redirectCount, handler) {
      }
      addErrorAndTimeoutHandlers(request, reject, timeout = 60 * 1e3) {
        this.addTimeOutHandler(request, reject, timeout);
        request.on("error", reject);
        request.on("aborted", () => {
          reject(new Error("Request has been aborted by the server"));
        });
      }
      handleResponse(response, options, cancellationToken, resolve5, reject, redirectCount, requestProcessor) {
        var _a;
        if (debug.enabled) {
          debug(`Response: ${response.statusCode} ${response.statusMessage}, request options: ${safeStringifyJson(options)}`);
        }
        if (response.statusCode === 404) {
          reject(createHttpError(response, `method: ${options.method || "GET"} url: ${options.protocol || "https:"}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}

Please double check that your authentication token is correct. Due to security reasons, actual status maybe not reported, but 404.
`));
          return;
        } else if (response.statusCode === 204) {
          resolve5();
          return;
        }
        const code = (_a = response.statusCode) !== null && _a !== void 0 ? _a : 0;
        const shouldRedirect = code >= 300 && code < 400;
        const redirectUrl = safeGetHeader(response, "location");
        if (shouldRedirect && redirectUrl != null) {
          if (redirectCount > this.maxRedirects) {
            reject(this.createMaxRedirectError());
            return;
          }
          this.doApiRequest(_HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options), cancellationToken, requestProcessor, redirectCount).then(resolve5).catch(reject);
          return;
        }
        response.setEncoding("utf8");
        let data = "";
        response.on("error", reject);
        response.on("data", (chunk) => data += chunk);
        response.on("end", () => {
          try {
            if (response.statusCode != null && response.statusCode >= 400) {
              const contentType = safeGetHeader(response, "content-type");
              const isJson = contentType != null && (Array.isArray(contentType) ? contentType.find((it) => it.includes("json")) != null : contentType.includes("json"));
              reject(createHttpError(response, `method: ${options.method || "GET"} url: ${options.protocol || "https:"}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}

          Data:
          ${isJson ? JSON.stringify(JSON.parse(data)) : data}
          `));
            } else {
              resolve5(data.length === 0 ? null : data);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
      async downloadToBuffer(url, options) {
        return await options.cancellationToken.createPromise((resolve5, reject, onCancel) => {
          const responseChunks = [];
          const requestOptions = {
            headers: options.headers || void 0,
            // because PrivateGitHubProvider requires HttpExecutor.prepareRedirectUrlOptions logic, so, we need to redirect manually
            redirect: "manual"
          };
          configureRequestUrl(url, requestOptions);
          configureRequestOptions(requestOptions);
          this.doDownload(requestOptions, {
            destination: null,
            options,
            onCancel,
            callback: (error) => {
              if (error == null) {
                resolve5(Buffer.concat(responseChunks));
              } else {
                reject(error);
              }
            },
            responseHandler: (response, callback) => {
              let receivedLength = 0;
              response.on("data", (chunk) => {
                receivedLength += chunk.length;
                if (receivedLength > 524288e3) {
                  callback(new Error("Maximum allowed size is 500 MB"));
                  return;
                }
                responseChunks.push(chunk);
              });
              response.on("end", () => {
                callback(null);
              });
            }
          }, 0);
        });
      }
      doDownload(requestOptions, options, redirectCount) {
        const request = this.createRequest(requestOptions, (response) => {
          if (response.statusCode >= 400) {
            options.callback(new Error(`Cannot download "${requestOptions.protocol || "https:"}//${requestOptions.hostname}${requestOptions.path}", status ${response.statusCode}: ${response.statusMessage}`));
            return;
          }
          response.on("error", options.callback);
          const redirectUrl = safeGetHeader(response, "location");
          if (redirectUrl != null) {
            if (redirectCount < this.maxRedirects) {
              this.doDownload(_HttpExecutor.prepareRedirectUrlOptions(redirectUrl, requestOptions), options, redirectCount++);
            } else {
              options.callback(this.createMaxRedirectError());
            }
            return;
          }
          if (options.responseHandler == null) {
            configurePipes(options, response);
          } else {
            options.responseHandler(response, options.callback);
          }
        });
        this.addErrorAndTimeoutHandlers(request, options.callback, requestOptions.timeout);
        this.addRedirectHandlers(request, requestOptions, options.callback, redirectCount, (requestOptions2) => {
          this.doDownload(requestOptions2, options, redirectCount++);
        });
        request.end();
      }
      createMaxRedirectError() {
        return new Error(`Too many redirects (> ${this.maxRedirects})`);
      }
      addTimeOutHandler(request, callback, timeout) {
        request.on("socket", (socket) => {
          socket.setTimeout(timeout, () => {
            request.abort();
            callback(new Error("Request timed out"));
          });
        });
      }
      static prepareRedirectUrlOptions(redirectUrl, options) {
        const newOptions = configureRequestOptionsFromUrl(redirectUrl, { ...options });
        const headers = newOptions.headers;
        if (headers === null || headers === void 0 ? void 0 : headers.authorization) {
          const originalUrl = _HttpExecutor.reconstructOriginalUrl(options);
          const parsedRedirectUrl = parseUrl(redirectUrl, options);
          if (_HttpExecutor.isCrossOriginRedirect(originalUrl, parsedRedirectUrl)) {
            if (debug.enabled) {
              debug(`Given the cross-origin redirect (from ${originalUrl.host} to ${parsedRedirectUrl.host}), the Authorization header will be stripped out.`);
            }
            delete headers.authorization;
          }
        }
        return newOptions;
      }
      static reconstructOriginalUrl(options) {
        const protocol = options.protocol || "https:";
        if (!options.hostname) {
          throw new Error("Missing hostname in request options");
        }
        const hostname = options.hostname;
        const port = options.port ? `:${options.port}` : "";
        const path16 = options.path || "/";
        return new url_1.URL(`${protocol}//${hostname}${port}${path16}`);
      }
      static isCrossOriginRedirect(originalUrl, redirectUrl) {
        if (originalUrl.hostname.toLowerCase() !== redirectUrl.hostname.toLowerCase()) {
          return true;
        }
        if (originalUrl.protocol === "http:" && // This can be replaced with `!originalUrl.port`, but for the sake of clarity.
        ["80", ""].includes(originalUrl.port) && redirectUrl.protocol === "https:" && // This can be replaced with `!redirectUrl.port`, but for the sake of clarity.
        ["443", ""].includes(redirectUrl.port)) {
          return false;
        }
        if (originalUrl.protocol !== redirectUrl.protocol) {
          return true;
        }
        const originalPort = originalUrl.port;
        const redirectPort = redirectUrl.port;
        return originalPort !== redirectPort;
      }
      static retryOnServerError(task, maxRetries = 3) {
        for (let attemptNumber = 0; ; attemptNumber++) {
          try {
            return task();
          } catch (e) {
            if (attemptNumber < maxRetries && (e instanceof HttpError && e.isServerError() || e.code === "EPIPE")) {
              continue;
            }
            throw e;
          }
        }
      }
    };
    exports2.HttpExecutor = HttpExecutor;
    function parseUrl(url, options) {
      try {
        return new url_1.URL(url);
      } catch {
        const hostname = options.hostname;
        const protocol = options.protocol || "https:";
        const port = options.port ? `:${options.port}` : "";
        const baseUrl = `${protocol}//${hostname}${port}`;
        return new url_1.URL(url, baseUrl);
      }
    }
    function configureRequestOptionsFromUrl(url, options) {
      const result = configureRequestOptions(options);
      const parsedUrl = parseUrl(url, options);
      configureRequestUrl(parsedUrl, result);
      return result;
    }
    function configureRequestUrl(url, options) {
      options.protocol = url.protocol;
      options.hostname = url.hostname;
      if (url.port) {
        options.port = url.port;
      } else if (options.port) {
        delete options.port;
      }
      options.path = url.pathname + url.search;
    }
    var DigestTransform = class extends stream_1.Transform {
      // noinspection JSUnusedGlobalSymbols
      get actual() {
        return this._actual;
      }
      constructor(expected, algorithm = "sha512", encoding = "base64") {
        super();
        this.expected = expected;
        this.algorithm = algorithm;
        this.encoding = encoding;
        this._actual = null;
        this.isValidateOnEnd = true;
        this.digester = (0, crypto_1.createHash)(algorithm);
      }
      // noinspection JSUnusedGlobalSymbols
      _transform(chunk, encoding, callback) {
        this.digester.update(chunk);
        callback(null, chunk);
      }
      // noinspection JSUnusedGlobalSymbols
      _flush(callback) {
        this._actual = this.digester.digest(this.encoding);
        if (this.isValidateOnEnd) {
          try {
            this.validate();
          } catch (e) {
            callback(e);
            return;
          }
        }
        callback(null);
      }
      validate() {
        if (this._actual == null) {
          throw (0, error_1.newError)("Not finished yet", "ERR_STREAM_NOT_FINISHED");
        }
        if (this._actual !== this.expected) {
          throw (0, error_1.newError)(`${this.algorithm} checksum mismatch, expected ${this.expected}, got ${this._actual}`, "ERR_CHECKSUM_MISMATCH");
        }
        return null;
      }
    };
    exports2.DigestTransform = DigestTransform;
    function checkSha2(sha2Header, sha2, callback) {
      if (sha2Header != null && sha2 != null && sha2Header !== sha2) {
        callback(new Error(`checksum mismatch: expected ${sha2} but got ${sha2Header} (X-Checksum-Sha2 header)`));
        return false;
      }
      return true;
    }
    function safeGetHeader(response, headerKey) {
      const value = response.headers[headerKey];
      if (value == null) {
        return null;
      } else if (Array.isArray(value)) {
        return value.length === 0 ? null : value[value.length - 1];
      } else {
        return value;
      }
    }
    function configurePipes(options, response) {
      if (!checkSha2(safeGetHeader(response, "X-Checksum-Sha2"), options.options.sha2, options.callback)) {
        return;
      }
      const streams = [];
      if (options.options.onProgress != null) {
        const contentLength = safeGetHeader(response, "content-length");
        if (contentLength != null) {
          streams.push(new ProgressCallbackTransform_1.ProgressCallbackTransform(parseInt(contentLength, 10), options.options.cancellationToken, options.options.onProgress));
        }
      }
      const sha512 = options.options.sha512;
      if (sha512 != null) {
        streams.push(new DigestTransform(sha512, "sha512", sha512.length === 128 && !sha512.includes("+") && !sha512.includes("Z") && !sha512.includes("=") ? "hex" : "base64"));
      } else if (options.options.sha2 != null) {
        streams.push(new DigestTransform(options.options.sha2, "sha256", "hex"));
      }
      const fileOut = (0, fs_1.createWriteStream)(options.destination);
      streams.push(fileOut);
      let lastStream = response;
      for (const stream of streams) {
        stream.on("error", (error) => {
          fileOut.close();
          if (!options.options.cancellationToken.cancelled) {
            options.callback(error);
          }
        });
        lastStream = lastStream.pipe(stream);
      }
      fileOut.on("finish", () => {
        ;
        fileOut.close(options.callback);
      });
    }
    function configureRequestOptions(options, token, method) {
      if (method != null) {
        options.method = method;
      }
      options.headers = { ...options.headers };
      const headers = options.headers;
      if (token != null) {
        ;
        headers.authorization = token.startsWith("Basic") || token.startsWith("Bearer") ? token : `token ${token}`;
      }
      if (headers["User-Agent"] == null) {
        headers["User-Agent"] = "electron-builder";
      }
      if (method == null || method === "GET" || headers["Cache-Control"] == null) {
        headers["Cache-Control"] = "no-cache";
      }
      if (options.protocol == null && process.versions.electron != null) {
        options.protocol = "https:";
      }
      return options;
    }
    function safeStringifyJson(data, skippedNames) {
      return JSON.stringify(data, (name, value) => {
        if (name.endsWith("Authorization") || name.endsWith("authorization") || name.endsWith("Password") || name.endsWith("PASSWORD") || name.endsWith("Token") || name.includes("password") || name.includes("token") || skippedNames != null && skippedNames.has(name)) {
          return "<stripped sensitive data>";
        }
        return value;
      }, 2);
    }
  }
});

// node_modules/builder-util-runtime/out/MemoLazy.js
var require_MemoLazy = __commonJS({
  "node_modules/builder-util-runtime/out/MemoLazy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MemoLazy = void 0;
    var MemoLazy = class {
      constructor(selector, creator) {
        this.selector = selector;
        this.creator = creator;
        this.selected = void 0;
        this._value = void 0;
      }
      get hasValue() {
        return this._value !== void 0;
      }
      get value() {
        const selected = this.selector();
        if (this._value !== void 0 && equals(this.selected, selected)) {
          return this._value;
        }
        this.selected = selected;
        const result = this.creator(selected);
        this.value = result;
        return result;
      }
      set value(value) {
        this._value = value;
      }
    };
    exports2.MemoLazy = MemoLazy;
    function equals(firstValue, secondValue) {
      const isFirstObject = typeof firstValue === "object" && firstValue !== null;
      const isSecondObject = typeof secondValue === "object" && secondValue !== null;
      if (isFirstObject && isSecondObject) {
        const keys1 = Object.keys(firstValue);
        const keys2 = Object.keys(secondValue);
        return keys1.length === keys2.length && keys1.every((key) => equals(firstValue[key], secondValue[key]));
      }
      return firstValue === secondValue;
    }
  }
});

// node_modules/builder-util-runtime/out/publishOptions.js
var require_publishOptions = __commonJS({
  "node_modules/builder-util-runtime/out/publishOptions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.githubUrl = githubUrl;
    exports2.githubTagPrefix = githubTagPrefix;
    exports2.getS3LikeProviderBaseUrl = getS3LikeProviderBaseUrl;
    function githubUrl(options, defaultHost = "github.com") {
      return `${options.protocol || "https"}://${options.host || defaultHost}`;
    }
    function githubTagPrefix(options) {
      var _a;
      if (options.tagNamePrefix) {
        return options.tagNamePrefix;
      }
      if ((_a = options.vPrefixedTagName) !== null && _a !== void 0 ? _a : true) {
        return "v";
      }
      return "";
    }
    function getS3LikeProviderBaseUrl(configuration) {
      const provider = configuration.provider;
      if (provider === "s3") {
        return s3Url(configuration);
      }
      if (provider === "spaces") {
        return spacesUrl(configuration);
      }
      throw new Error(`Not supported provider: ${provider}`);
    }
    function s3Url(options) {
      let url;
      if (options.accelerate == true) {
        url = `https://${options.bucket}.s3-accelerate.amazonaws.com`;
      } else if (options.endpoint != null) {
        url = `${options.endpoint}/${options.bucket}`;
      } else if (options.bucket.includes(".")) {
        if (options.region == null) {
          throw new Error(`Bucket name "${options.bucket}" includes a dot, but S3 region is missing`);
        }
        if (options.region === "us-east-1") {
          url = `https://s3.amazonaws.com/${options.bucket}`;
        } else {
          url = `https://s3-${options.region}.amazonaws.com/${options.bucket}`;
        }
      } else if (options.region === "cn-north-1") {
        url = `https://${options.bucket}.s3.${options.region}.amazonaws.com.cn`;
      } else {
        url = `https://${options.bucket}.s3.amazonaws.com`;
      }
      return appendPath(url, options.path);
    }
    function appendPath(url, p) {
      if (p != null && p.length > 0) {
        if (!p.startsWith("/")) {
          url += "/";
        }
        url += p;
      }
      return url;
    }
    function spacesUrl(options) {
      if (options.name == null) {
        throw new Error(`name is missing`);
      }
      if (options.region == null) {
        throw new Error(`region is missing`);
      }
      return appendPath(`https://${options.name}.${options.region}.digitaloceanspaces.com`, options.path);
    }
  }
});

// node_modules/builder-util-runtime/out/retry.js
var require_retry = __commonJS({
  "node_modules/builder-util-runtime/out/retry.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.retry = retry;
    var CancellationToken_1 = require_CancellationToken();
    async function retry(task, options) {
      var _a;
      const { retries: retryCount, interval, backoff = 0, attempt = 0, shouldRetry, cancellationToken = new CancellationToken_1.CancellationToken() } = options;
      try {
        return await task();
      } catch (error) {
        if (await Promise.resolve((_a = shouldRetry === null || shouldRetry === void 0 ? void 0 : shouldRetry(error)) !== null && _a !== void 0 ? _a : true) && retryCount > 0 && !cancellationToken.cancelled) {
          await new Promise((resolve5) => setTimeout(resolve5, interval + backoff * attempt));
          return await retry(task, { ...options, retries: retryCount - 1, attempt: attempt + 1 });
        } else {
          throw error;
        }
      }
    }
  }
});

// node_modules/builder-util-runtime/out/rfc2253Parser.js
var require_rfc2253Parser = __commonJS({
  "node_modules/builder-util-runtime/out/rfc2253Parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseDn = parseDn;
    function parseDn(seq) {
      let quoted = false;
      let key = null;
      let token = "";
      let nextNonSpace = 0;
      seq = seq.trim();
      const result = /* @__PURE__ */ new Map();
      for (let i = 0; i <= seq.length; i++) {
        if (i === seq.length) {
          if (key !== null) {
            result.set(key, token);
          }
          break;
        }
        const ch = seq[i];
        if (quoted) {
          if (ch === '"') {
            quoted = false;
            continue;
          }
        } else {
          if (ch === '"') {
            quoted = true;
            continue;
          }
          if (ch === "\\") {
            i++;
            const ord = parseInt(seq.slice(i, i + 2), 16);
            if (Number.isNaN(ord)) {
              token += seq[i];
            } else {
              i++;
              token += String.fromCharCode(ord);
            }
            continue;
          }
          if (key === null && ch === "=") {
            key = token;
            token = "";
            continue;
          }
          if (ch === "," || ch === ";" || ch === "+") {
            if (key !== null) {
              result.set(key, token);
            }
            key = null;
            token = "";
            continue;
          }
        }
        if (ch === " " && !quoted) {
          if (token.length === 0) {
            continue;
          }
          if (i > nextNonSpace) {
            let j = i;
            while (seq[j] === " ") {
              j++;
            }
            nextNonSpace = j;
          }
          if (nextNonSpace >= seq.length || seq[nextNonSpace] === "," || seq[nextNonSpace] === ";" || key === null && seq[nextNonSpace] === "=" || key !== null && seq[nextNonSpace] === "+") {
            i = nextNonSpace - 1;
            continue;
          }
        }
        token += ch;
      }
      return result;
    }
  }
});

// node_modules/builder-util-runtime/out/uuid.js
var require_uuid = __commonJS({
  "node_modules/builder-util-runtime/out/uuid.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.nil = exports2.UUID = void 0;
    var crypto_1 = require("crypto");
    var error_1 = require_error();
    var invalidName = "options.name must be either a string or a Buffer";
    var randomHost = (0, crypto_1.randomBytes)(16);
    randomHost[0] = randomHost[0] | 1;
    var hex2byte = {};
    var byte2hex = [];
    for (let i = 0; i < 256; i++) {
      const hex = (i + 256).toString(16).substr(1);
      hex2byte[hex] = i;
      byte2hex[i] = hex;
    }
    var UUID = class _UUID {
      constructor(uuid) {
        this.ascii = null;
        this.binary = null;
        const check = _UUID.check(uuid);
        if (!check) {
          throw new Error("not a UUID");
        }
        this.version = check.version;
        if (check.format === "ascii") {
          this.ascii = uuid;
        } else {
          this.binary = uuid;
        }
      }
      static v5(name, namespace) {
        return uuidNamed(name, "sha1", 80, namespace);
      }
      toString() {
        if (this.ascii == null) {
          this.ascii = stringify(this.binary);
        }
        return this.ascii;
      }
      inspect() {
        return `UUID v${this.version} ${this.toString()}`;
      }
      static check(uuid, offset = 0) {
        if (typeof uuid === "string") {
          uuid = uuid.toLowerCase();
          if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-([a-f0-9]{12})$/.test(uuid)) {
            return false;
          }
          if (uuid === "00000000-0000-0000-0000-000000000000") {
            return { version: void 0, variant: "nil", format: "ascii" };
          }
          return {
            version: (hex2byte[uuid[14] + uuid[15]] & 240) >> 4,
            variant: getVariant((hex2byte[uuid[19] + uuid[20]] & 224) >> 5),
            format: "ascii"
          };
        }
        if (Buffer.isBuffer(uuid)) {
          if (uuid.length < offset + 16) {
            return false;
          }
          let i = 0;
          for (; i < 16; i++) {
            if (uuid[offset + i] !== 0) {
              break;
            }
          }
          if (i === 16) {
            return { version: void 0, variant: "nil", format: "binary" };
          }
          return {
            version: (uuid[offset + 6] & 240) >> 4,
            variant: getVariant((uuid[offset + 8] & 224) >> 5),
            format: "binary"
          };
        }
        throw (0, error_1.newError)("Unknown type of uuid", "ERR_UNKNOWN_UUID_TYPE");
      }
      // read stringified uuid into a Buffer
      static parse(input) {
        const buffer2 = Buffer.allocUnsafe(16);
        let j = 0;
        for (let i = 0; i < 16; i++) {
          buffer2[i] = hex2byte[input[j++] + input[j++]];
          if (i === 3 || i === 5 || i === 7 || i === 9) {
            j += 1;
          }
        }
        return buffer2;
      }
    };
    exports2.UUID = UUID;
    UUID.OID = UUID.parse("6ba7b812-9dad-11d1-80b4-00c04fd430c8");
    function getVariant(bits) {
      switch (bits) {
        case 0:
        case 1:
        case 3:
          return "ncs";
        case 4:
        case 5:
          return "rfc4122";
        case 6:
          return "microsoft";
        default:
          return "future";
      }
    }
    var UuidEncoding;
    (function(UuidEncoding2) {
      UuidEncoding2[UuidEncoding2["ASCII"] = 0] = "ASCII";
      UuidEncoding2[UuidEncoding2["BINARY"] = 1] = "BINARY";
      UuidEncoding2[UuidEncoding2["OBJECT"] = 2] = "OBJECT";
    })(UuidEncoding || (UuidEncoding = {}));
    function uuidNamed(name, hashMethod, version, namespace, encoding = UuidEncoding.ASCII) {
      const hash = (0, crypto_1.createHash)(hashMethod);
      const nameIsNotAString = typeof name !== "string";
      if (nameIsNotAString && !Buffer.isBuffer(name)) {
        throw (0, error_1.newError)(invalidName, "ERR_INVALID_UUID_NAME");
      }
      hash.update(namespace);
      hash.update(name);
      const buffer2 = hash.digest();
      let result;
      switch (encoding) {
        case UuidEncoding.BINARY:
          buffer2[6] = buffer2[6] & 15 | version;
          buffer2[8] = buffer2[8] & 63 | 128;
          result = buffer2;
          break;
        case UuidEncoding.OBJECT:
          buffer2[6] = buffer2[6] & 15 | version;
          buffer2[8] = buffer2[8] & 63 | 128;
          result = new UUID(buffer2);
          break;
        default:
          result = byte2hex[buffer2[0]] + byte2hex[buffer2[1]] + byte2hex[buffer2[2]] + byte2hex[buffer2[3]] + "-" + byte2hex[buffer2[4]] + byte2hex[buffer2[5]] + "-" + byte2hex[buffer2[6] & 15 | version] + byte2hex[buffer2[7]] + "-" + byte2hex[buffer2[8] & 63 | 128] + byte2hex[buffer2[9]] + "-" + byte2hex[buffer2[10]] + byte2hex[buffer2[11]] + byte2hex[buffer2[12]] + byte2hex[buffer2[13]] + byte2hex[buffer2[14]] + byte2hex[buffer2[15]];
          break;
      }
      return result;
    }
    function stringify(buffer2) {
      return byte2hex[buffer2[0]] + byte2hex[buffer2[1]] + byte2hex[buffer2[2]] + byte2hex[buffer2[3]] + "-" + byte2hex[buffer2[4]] + byte2hex[buffer2[5]] + "-" + byte2hex[buffer2[6]] + byte2hex[buffer2[7]] + "-" + byte2hex[buffer2[8]] + byte2hex[buffer2[9]] + "-" + byte2hex[buffer2[10]] + byte2hex[buffer2[11]] + byte2hex[buffer2[12]] + byte2hex[buffer2[13]] + byte2hex[buffer2[14]] + byte2hex[buffer2[15]];
    }
    exports2.nil = new UUID("00000000-0000-0000-0000-000000000000");
  }
});

// node_modules/sax/lib/sax.js
var require_sax = __commonJS({
  "node_modules/sax/lib/sax.js"(exports2) {
    (function(sax) {
      sax.parser = function(strict, opt) {
        return new SAXParser(strict, opt);
      };
      sax.SAXParser = SAXParser;
      sax.SAXStream = SAXStream;
      sax.createStream = createStream;
      sax.MAX_BUFFER_LENGTH = 64 * 1024;
      var buffers = [
        "comment",
        "sgmlDecl",
        "textNode",
        "tagName",
        "doctype",
        "procInstName",
        "procInstBody",
        "entity",
        "attribName",
        "attribValue",
        "cdata",
        "script"
      ];
      sax.EVENTS = [
        "text",
        "processinginstruction",
        "sgmldeclaration",
        "doctype",
        "comment",
        "opentagstart",
        "attribute",
        "opentag",
        "closetag",
        "opencdata",
        "cdata",
        "closecdata",
        "error",
        "end",
        "ready",
        "script",
        "opennamespace",
        "closenamespace"
      ];
      function SAXParser(strict, opt) {
        if (!(this instanceof SAXParser)) {
          return new SAXParser(strict, opt);
        }
        var parser = this;
        clearBuffers(parser);
        parser.q = parser.c = "";
        parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH;
        parser.opt = opt || {};
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
        parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase";
        parser.opt.maxEntityCount = parser.opt.maxEntityCount || 512;
        parser.opt.maxEntityDepth = parser.opt.maxEntityDepth || 4;
        parser.entityCount = parser.entityDepth = 0;
        parser.tags = [];
        parser.closed = parser.closedRoot = parser.sawRoot = false;
        parser.tag = parser.error = null;
        parser.strict = !!strict;
        parser.noscript = !!(strict || parser.opt.noscript);
        parser.state = S.BEGIN;
        parser.strictEntities = parser.opt.strictEntities;
        parser.ENTITIES = parser.strictEntities ? Object.create(sax.XML_ENTITIES) : Object.create(sax.ENTITIES);
        parser.attribList = [];
        if (parser.opt.xmlns) {
          parser.ns = Object.create(rootNS);
        }
        if (parser.opt.unquotedAttributeValues === void 0) {
          parser.opt.unquotedAttributeValues = !strict;
        }
        parser.trackPosition = parser.opt.position !== false;
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0;
        }
        emit(parser, "onready");
      }
      if (!Object.create) {
        Object.create = function(o) {
          function F() {
          }
          F.prototype = o;
          var newf = new F();
          return newf;
        };
      }
      if (!Object.keys) {
        Object.keys = function(o) {
          var a = [];
          for (var i in o) if (o.hasOwnProperty(i)) a.push(i);
          return a;
        };
      }
      function checkBufferLength(parser) {
        var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10);
        var maxActual = 0;
        for (var i = 0, l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length;
          if (len > maxAllowed) {
            switch (buffers[i]) {
              case "textNode":
                closeText(parser);
                break;
              case "cdata":
                emitNode(parser, "oncdata", parser.cdata);
                parser.cdata = "";
                break;
              case "script":
                emitNode(parser, "onscript", parser.script);
                parser.script = "";
                break;
              default:
                error(parser, "Max buffer length exceeded: " + buffers[i]);
            }
          }
          maxActual = Math.max(maxActual, len);
        }
        var m = sax.MAX_BUFFER_LENGTH - maxActual;
        parser.bufferCheckPosition = m + parser.position;
      }
      function clearBuffers(parser) {
        for (var i = 0, l = buffers.length; i < l; i++) {
          parser[buffers[i]] = "";
        }
      }
      function flushBuffers(parser) {
        closeText(parser);
        if (parser.cdata !== "") {
          emitNode(parser, "oncdata", parser.cdata);
          parser.cdata = "";
        }
        if (parser.script !== "") {
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
      }
      SAXParser.prototype = {
        end: function() {
          end(this);
        },
        write,
        resume: function() {
          this.error = null;
          return this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          flushBuffers(this);
        }
      };
      var Stream;
      try {
        Stream = require("stream").Stream;
      } catch (ex) {
        Stream = function() {
        };
      }
      if (!Stream) Stream = function() {
      };
      var streamWraps = sax.EVENTS.filter(function(ev) {
        return ev !== "error" && ev !== "end";
      });
      function createStream(strict, opt) {
        return new SAXStream(strict, opt);
      }
      function SAXStream(strict, opt) {
        if (!(this instanceof SAXStream)) {
          return new SAXStream(strict, opt);
        }
        Stream.apply(this);
        this._parser = new SAXParser(strict, opt);
        this.writable = true;
        this.readable = true;
        var me = this;
        this._parser.onend = function() {
          me.emit("end");
        };
        this._parser.onerror = function(er) {
          me.emit("error", er);
          me._parser.error = null;
        };
        this._decoder = null;
        streamWraps.forEach(function(ev) {
          Object.defineProperty(me, "on" + ev, {
            get: function() {
              return me._parser["on" + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                me._parser["on" + ev] = h;
                return h;
              }
              me.on(ev, h);
            },
            enumerable: true,
            configurable: false
          });
        });
      }
      SAXStream.prototype = Object.create(Stream.prototype, {
        constructor: {
          value: SAXStream
        }
      });
      SAXStream.prototype.write = function(data) {
        if (typeof Buffer === "function" && typeof Buffer.isBuffer === "function" && Buffer.isBuffer(data)) {
          if (!this._decoder) {
            this._decoder = new TextDecoder("utf8");
          }
          data = this._decoder.decode(data, { stream: true });
        }
        this._parser.write(data.toString());
        this.emit("data", data);
        return true;
      };
      SAXStream.prototype.end = function(chunk) {
        if (chunk && chunk.length) {
          this.write(chunk);
        }
        if (this._decoder) {
          var remaining = this._decoder.decode();
          if (remaining) {
            this._parser.write(remaining);
            this.emit("data", remaining);
          }
        }
        this._parser.end();
        return true;
      };
      SAXStream.prototype.on = function(ev, handler) {
        var me = this;
        if (!me._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser["on" + ev] = function() {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
            args.splice(0, 0, ev);
            me.emit.apply(me, args);
          };
        }
        return Stream.prototype.on.call(me, ev, handler);
      };
      var CDATA = "[CDATA[";
      var DOCTYPE = "DOCTYPE";
      var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
      var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
      var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE };
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      function isWhitespace(c) {
        return c === " " || c === "\n" || c === "\r" || c === "	";
      }
      function isQuote(c) {
        return c === '"' || c === "'";
      }
      function isAttribEnd(c) {
        return c === ">" || isWhitespace(c);
      }
      function isMatch(regex, c) {
        return regex.test(c);
      }
      function notMatch(regex, c) {
        return !isMatch(regex, c);
      }
      var S = 0;
      sax.STATE = {
        BEGIN: S++,
        // leading byte order mark or whitespace
        BEGIN_WHITESPACE: S++,
        // leading whitespace
        TEXT: S++,
        // general stuff
        TEXT_ENTITY: S++,
        // &amp and such.
        OPEN_WAKA: S++,
        // <
        SGML_DECL: S++,
        // <!BLARG
        SGML_DECL_QUOTED: S++,
        // <!BLARG foo "bar
        DOCTYPE: S++,
        // <!DOCTYPE
        DOCTYPE_QUOTED: S++,
        // <!DOCTYPE "//blah
        DOCTYPE_DTD: S++,
        // <!DOCTYPE "//blah" [ ...
        DOCTYPE_DTD_QUOTED: S++,
        // <!DOCTYPE "//blah" [ "foo
        COMMENT_STARTING: S++,
        // <!-
        COMMENT: S++,
        // <!--
        COMMENT_ENDING: S++,
        // <!-- blah -
        COMMENT_ENDED: S++,
        // <!-- blah --
        CDATA: S++,
        // <![CDATA[ something
        CDATA_ENDING: S++,
        // ]
        CDATA_ENDING_2: S++,
        // ]]
        PROC_INST: S++,
        // <?hi
        PROC_INST_BODY: S++,
        // <?hi there
        PROC_INST_ENDING: S++,
        // <?hi "there" ?
        OPEN_TAG: S++,
        // <strong
        OPEN_TAG_SLASH: S++,
        // <strong /
        ATTRIB: S++,
        // <a
        ATTRIB_NAME: S++,
        // <a foo
        ATTRIB_NAME_SAW_WHITE: S++,
        // <a foo _
        ATTRIB_VALUE: S++,
        // <a foo=
        ATTRIB_VALUE_QUOTED: S++,
        // <a foo="bar
        ATTRIB_VALUE_CLOSED: S++,
        // <a foo="bar"
        ATTRIB_VALUE_UNQUOTED: S++,
        // <a foo=bar
        ATTRIB_VALUE_ENTITY_Q: S++,
        // <foo bar="&quot;"
        ATTRIB_VALUE_ENTITY_U: S++,
        // <foo bar=&quot
        CLOSE_TAG: S++,
        // </a
        CLOSE_TAG_SAW_WHITE: S++,
        // </a   >
        SCRIPT: S++,
        // <script> ...
        SCRIPT_ENDING: S++
        // <script> ... <
      };
      sax.XML_ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'"
      };
      sax.ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'",
        AElig: 198,
        Aacute: 193,
        Acirc: 194,
        Agrave: 192,
        Aring: 197,
        Atilde: 195,
        Auml: 196,
        Ccedil: 199,
        ETH: 208,
        Eacute: 201,
        Ecirc: 202,
        Egrave: 200,
        Euml: 203,
        Iacute: 205,
        Icirc: 206,
        Igrave: 204,
        Iuml: 207,
        Ntilde: 209,
        Oacute: 211,
        Ocirc: 212,
        Ograve: 210,
        Oslash: 216,
        Otilde: 213,
        Ouml: 214,
        THORN: 222,
        Uacute: 218,
        Ucirc: 219,
        Ugrave: 217,
        Uuml: 220,
        Yacute: 221,
        aacute: 225,
        acirc: 226,
        aelig: 230,
        agrave: 224,
        aring: 229,
        atilde: 227,
        auml: 228,
        ccedil: 231,
        eacute: 233,
        ecirc: 234,
        egrave: 232,
        eth: 240,
        euml: 235,
        iacute: 237,
        icirc: 238,
        igrave: 236,
        iuml: 239,
        ntilde: 241,
        oacute: 243,
        ocirc: 244,
        ograve: 242,
        oslash: 248,
        otilde: 245,
        ouml: 246,
        szlig: 223,
        thorn: 254,
        uacute: 250,
        ucirc: 251,
        ugrave: 249,
        uuml: 252,
        yacute: 253,
        yuml: 255,
        copy: 169,
        reg: 174,
        nbsp: 160,
        iexcl: 161,
        cent: 162,
        pound: 163,
        curren: 164,
        yen: 165,
        brvbar: 166,
        sect: 167,
        uml: 168,
        ordf: 170,
        laquo: 171,
        not: 172,
        shy: 173,
        macr: 175,
        deg: 176,
        plusmn: 177,
        sup1: 185,
        sup2: 178,
        sup3: 179,
        acute: 180,
        micro: 181,
        para: 182,
        middot: 183,
        cedil: 184,
        ordm: 186,
        raquo: 187,
        frac14: 188,
        frac12: 189,
        frac34: 190,
        iquest: 191,
        times: 215,
        divide: 247,
        OElig: 338,
        oelig: 339,
        Scaron: 352,
        scaron: 353,
        Yuml: 376,
        fnof: 402,
        circ: 710,
        tilde: 732,
        Alpha: 913,
        Beta: 914,
        Gamma: 915,
        Delta: 916,
        Epsilon: 917,
        Zeta: 918,
        Eta: 919,
        Theta: 920,
        Iota: 921,
        Kappa: 922,
        Lambda: 923,
        Mu: 924,
        Nu: 925,
        Xi: 926,
        Omicron: 927,
        Pi: 928,
        Rho: 929,
        Sigma: 931,
        Tau: 932,
        Upsilon: 933,
        Phi: 934,
        Chi: 935,
        Psi: 936,
        Omega: 937,
        alpha: 945,
        beta: 946,
        gamma: 947,
        delta: 948,
        epsilon: 949,
        zeta: 950,
        eta: 951,
        theta: 952,
        iota: 953,
        kappa: 954,
        lambda: 955,
        mu: 956,
        nu: 957,
        xi: 958,
        omicron: 959,
        pi: 960,
        rho: 961,
        sigmaf: 962,
        sigma: 963,
        tau: 964,
        upsilon: 965,
        phi: 966,
        chi: 967,
        psi: 968,
        omega: 969,
        thetasym: 977,
        upsih: 978,
        piv: 982,
        ensp: 8194,
        emsp: 8195,
        thinsp: 8201,
        zwnj: 8204,
        zwj: 8205,
        lrm: 8206,
        rlm: 8207,
        ndash: 8211,
        mdash: 8212,
        lsquo: 8216,
        rsquo: 8217,
        sbquo: 8218,
        ldquo: 8220,
        rdquo: 8221,
        bdquo: 8222,
        dagger: 8224,
        Dagger: 8225,
        bull: 8226,
        hellip: 8230,
        permil: 8240,
        prime: 8242,
        Prime: 8243,
        lsaquo: 8249,
        rsaquo: 8250,
        oline: 8254,
        frasl: 8260,
        euro: 8364,
        image: 8465,
        weierp: 8472,
        real: 8476,
        trade: 8482,
        alefsym: 8501,
        larr: 8592,
        uarr: 8593,
        rarr: 8594,
        darr: 8595,
        harr: 8596,
        crarr: 8629,
        lArr: 8656,
        uArr: 8657,
        rArr: 8658,
        dArr: 8659,
        hArr: 8660,
        forall: 8704,
        part: 8706,
        exist: 8707,
        empty: 8709,
        nabla: 8711,
        isin: 8712,
        notin: 8713,
        ni: 8715,
        prod: 8719,
        sum: 8721,
        minus: 8722,
        lowast: 8727,
        radic: 8730,
        prop: 8733,
        infin: 8734,
        ang: 8736,
        and: 8743,
        or: 8744,
        cap: 8745,
        cup: 8746,
        int: 8747,
        there4: 8756,
        sim: 8764,
        cong: 8773,
        asymp: 8776,
        ne: 8800,
        equiv: 8801,
        le: 8804,
        ge: 8805,
        sub: 8834,
        sup: 8835,
        nsub: 8836,
        sube: 8838,
        supe: 8839,
        oplus: 8853,
        otimes: 8855,
        perp: 8869,
        sdot: 8901,
        lceil: 8968,
        rceil: 8969,
        lfloor: 8970,
        rfloor: 8971,
        lang: 9001,
        rang: 9002,
        loz: 9674,
        spades: 9824,
        clubs: 9827,
        hearts: 9829,
        diams: 9830
      };
      Object.keys(sax.ENTITIES).forEach(function(key) {
        var e = sax.ENTITIES[key];
        var s2 = typeof e === "number" ? String.fromCharCode(e) : e;
        sax.ENTITIES[key] = s2;
      });
      for (var s in sax.STATE) {
        sax.STATE[sax.STATE[s]] = s;
      }
      S = sax.STATE;
      function emit(parser, event, data) {
        parser[event] && parser[event](data);
      }
      function emitNode(parser, nodeType, data) {
        if (parser.textNode) closeText(parser);
        emit(parser, nodeType, data);
      }
      function closeText(parser) {
        parser.textNode = textopts(parser.opt, parser.textNode);
        if (parser.textNode) emit(parser, "ontext", parser.textNode);
        parser.textNode = "";
      }
      function textopts(opt, text) {
        if (opt.trim) text = text.trim();
        if (opt.normalize) text = text.replace(/\s+/g, " ");
        return text;
      }
      function error(parser, er) {
        closeText(parser);
        if (parser.trackPosition) {
          er += "\nLine: " + parser.line + "\nColumn: " + parser.column + "\nChar: " + parser.c;
        }
        er = new Error(er);
        parser.error = er;
        emit(parser, "onerror", er);
        return parser;
      }
      function end(parser) {
        if (parser.sawRoot && !parser.closedRoot)
          strictFail(parser, "Unclosed root tag");
        if (parser.state !== S.BEGIN && parser.state !== S.BEGIN_WHITESPACE && parser.state !== S.TEXT) {
          error(parser, "Unexpected end");
        }
        closeText(parser);
        parser.c = "";
        parser.closed = true;
        emit(parser, "onend");
        SAXParser.call(parser, parser.strict, parser.opt);
        return parser;
      }
      function strictFail(parser, message) {
        if (typeof parser !== "object" || !(parser instanceof SAXParser)) {
          throw new Error("bad call to strictFail");
        }
        if (parser.strict) {
          error(parser, message);
        }
      }
      function newTag(parser) {
        if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]();
        var parent = parser.tags[parser.tags.length - 1] || parser;
        var tag = parser.tag = { name: parser.tagName, attributes: {} };
        if (parser.opt.xmlns) {
          tag.ns = parent.ns;
        }
        parser.attribList.length = 0;
        emitNode(parser, "onopentagstart", tag);
      }
      function qname(name, attribute) {
        var i = name.indexOf(":");
        var qualName = i < 0 ? ["", name] : name.split(":");
        var prefix = qualName[0];
        var local = qualName[1];
        if (attribute && name === "xmlns") {
          prefix = "xmlns";
          local = "";
        }
        return { prefix, local };
      }
      function attrib(parser) {
        if (!parser.strict) {
          parser.attribName = parser.attribName[parser.looseCase]();
        }
        if (parser.attribList.indexOf(parser.attribName) !== -1 || parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          parser.attribName = parser.attribValue = "";
          return;
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true);
          var prefix = qn.prefix;
          var local = qn.local;
          if (prefix === "xmlns") {
            if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
              strictFail(
                parser,
                "xml: prefix must be bound to " + XML_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(
                parser,
                "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else {
              var tag = parser.tag;
              var parent = parser.tags[parser.tags.length - 1] || parser;
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns);
              }
              tag.ns[local] = parser.attribValue;
            }
          }
          parser.attribList.push([parser.attribName, parser.attribValue]);
        } else {
          parser.tag.attributes[parser.attribName] = parser.attribValue;
          emitNode(parser, "onattribute", {
            name: parser.attribName,
            value: parser.attribValue
          });
        }
        parser.attribName = parser.attribValue = "";
      }
      function openTag(parser, selfClosing) {
        if (parser.opt.xmlns) {
          var tag = parser.tag;
          var qn = qname(parser.tagName);
          tag.prefix = qn.prefix;
          tag.local = qn.local;
          tag.uri = tag.ns[qn.prefix] || "";
          if (tag.prefix && !tag.uri) {
            strictFail(
              parser,
              "Unbound namespace prefix: " + JSON.stringify(parser.tagName)
            );
            tag.uri = qn.prefix;
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              emitNode(parser, "onopennamespace", {
                prefix: p,
                uri: tag.ns[p]
              });
            });
          }
          for (var i = 0, l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i];
            var name = nv[0];
            var value = nv[1];
            var qualName = qname(name, true);
            var prefix = qualName.prefix;
            var local = qualName.local;
            var uri = prefix === "" ? "" : tag.ns[prefix] || "";
            var a = {
              name,
              value,
              prefix,
              local,
              uri
            };
            if (prefix && prefix !== "xmlns" && !uri) {
              strictFail(
                parser,
                "Unbound namespace prefix: " + JSON.stringify(prefix)
              );
              a.uri = prefix;
            }
            parser.tag.attributes[name] = a;
            emitNode(parser, "onattribute", a);
          }
          parser.attribList.length = 0;
        }
        parser.tag.isSelfClosing = !!selfClosing;
        parser.sawRoot = true;
        parser.tags.push(parser.tag);
        emitNode(parser, "onopentag", parser.tag);
        if (!selfClosing) {
          if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
            parser.state = S.SCRIPT;
          } else {
            parser.state = S.TEXT;
          }
          parser.tag = null;
          parser.tagName = "";
        }
        parser.attribName = parser.attribValue = "";
        parser.attribList.length = 0;
      }
      function closeTag(parser) {
        if (!parser.tagName) {
          strictFail(parser, "Weird empty close tag.");
          parser.textNode += "</>";
          parser.state = S.TEXT;
          return;
        }
        if (parser.script) {
          if (parser.tagName !== "script") {
            parser.script += "</" + parser.tagName + ">";
            parser.tagName = "";
            parser.state = S.SCRIPT;
            return;
          }
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
        var t = parser.tags.length;
        var tagName = parser.tagName;
        if (!parser.strict) {
          tagName = tagName[parser.looseCase]();
        }
        var closeTo = tagName;
        while (t--) {
          var close = parser.tags[t];
          if (close.name !== closeTo) {
            strictFail(parser, "Unexpected close tag");
          } else {
            break;
          }
        }
        if (t < 0) {
          strictFail(parser, "Unmatched closing tag: " + parser.tagName);
          parser.textNode += "</" + parser.tagName + ">";
          parser.state = S.TEXT;
          return;
        }
        parser.tagName = tagName;
        var s2 = parser.tags.length;
        while (s2-- > t) {
          var tag = parser.tag = parser.tags.pop();
          parser.tagName = parser.tag.name;
          emitNode(parser, "onclosetag", parser.tagName);
          var x = {};
          for (var i in tag.ns) {
            x[i] = tag.ns[i];
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              var n = tag.ns[p];
              emitNode(parser, "onclosenamespace", { prefix: p, uri: n });
            });
          }
        }
        if (t === 0) parser.closedRoot = true;
        parser.tagName = parser.attribValue = parser.attribName = "";
        parser.attribList.length = 0;
        parser.state = S.TEXT;
      }
      function parseEntity(parser) {
        var entity = parser.entity;
        var entityLC = entity.toLowerCase();
        var num;
        var numStr = "";
        if (parser.ENTITIES[entity]) {
          return parser.ENTITIES[entity];
        }
        if (parser.ENTITIES[entityLC]) {
          return parser.ENTITIES[entityLC];
        }
        entity = entityLC;
        if (entity.charAt(0) === "#") {
          if (entity.charAt(1) === "x") {
            entity = entity.slice(2);
            num = parseInt(entity, 16);
            numStr = num.toString(16);
          } else {
            entity = entity.slice(1);
            num = parseInt(entity, 10);
            numStr = num.toString(10);
          }
        }
        entity = entity.replace(/^0+/, "");
        if (isNaN(num) || numStr.toLowerCase() !== entity || num < 0 || num > 1114111) {
          strictFail(parser, "Invalid character entity");
          return "&" + parser.entity + ";";
        }
        return String.fromCodePoint(num);
      }
      function beginWhiteSpace(parser, c) {
        if (c === "<") {
          parser.state = S.OPEN_WAKA;
          parser.startTagPosition = parser.position;
        } else if (!isWhitespace(c)) {
          strictFail(parser, "Non-whitespace before first tag.");
          parser.textNode = c;
          parser.state = S.TEXT;
        }
      }
      function charAt(chunk, i) {
        var result = "";
        if (i < chunk.length) {
          result = chunk.charAt(i);
        }
        return result;
      }
      function write(chunk) {
        var parser = this;
        if (this.error) {
          throw this.error;
        }
        if (parser.closed) {
          return error(
            parser,
            "Cannot write after close. Assign an onready handler."
          );
        }
        if (chunk === null) {
          return end(parser);
        }
        if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        var i = 0;
        var c = "";
        while (true) {
          c = charAt(chunk, i++);
          parser.c = c;
          if (!c) {
            break;
          }
          if (parser.trackPosition) {
            parser.position++;
            if (c === "\n") {
              parser.line++;
              parser.column = 0;
            } else {
              parser.column++;
            }
          }
          switch (parser.state) {
            case S.BEGIN:
              parser.state = S.BEGIN_WHITESPACE;
              if (c === "\uFEFF") {
                continue;
              }
              beginWhiteSpace(parser, c);
              continue;
            case S.BEGIN_WHITESPACE:
              beginWhiteSpace(parser, c);
              continue;
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1;
                while (c && c !== "<" && c !== "&") {
                  c = charAt(chunk, i++);
                  if (c && parser.trackPosition) {
                    parser.position++;
                    if (c === "\n") {
                      parser.line++;
                      parser.column = 0;
                    } else {
                      parser.column++;
                    }
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1);
              }
              if (c === "<" && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else {
                if (!isWhitespace(c) && (!parser.sawRoot || parser.closedRoot)) {
                  strictFail(parser, "Text data outside of root node.");
                }
                if (c === "&") {
                  parser.state = S.TEXT_ENTITY;
                } else {
                  parser.textNode += c;
                }
              }
              continue;
            case S.SCRIPT:
              if (c === "<") {
                parser.state = S.SCRIPT_ENDING;
              } else {
                parser.script += c;
              }
              continue;
            case S.SCRIPT_ENDING:
              if (c === "/") {
                parser.state = S.CLOSE_TAG;
              } else {
                parser.script += "<" + c;
                parser.state = S.SCRIPT;
              }
              continue;
            case S.OPEN_WAKA:
              if (c === "!") {
                parser.state = S.SGML_DECL;
                parser.sgmlDecl = "";
              } else if (isWhitespace(c)) {
              } else if (isMatch(nameStart, c)) {
                parser.state = S.OPEN_TAG;
                parser.tagName = c;
              } else if (c === "/") {
                parser.state = S.CLOSE_TAG;
                parser.tagName = "";
              } else if (c === "?") {
                parser.state = S.PROC_INST;
                parser.procInstName = parser.procInstBody = "";
              } else {
                strictFail(parser, "Unencoded <");
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition;
                  c = new Array(pad).join(" ") + c;
                }
                parser.textNode += "<" + c;
                parser.state = S.TEXT;
              }
              continue;
            case S.SGML_DECL:
              if (parser.sgmlDecl + c === "--") {
                parser.state = S.COMMENT;
                parser.comment = "";
                parser.sgmlDecl = "";
                continue;
              }
              if (parser.doctype && parser.doctype !== true && parser.sgmlDecl) {
                parser.state = S.DOCTYPE_DTD;
                parser.doctype += "<!" + parser.sgmlDecl + c;
                parser.sgmlDecl = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
                emitNode(parser, "onopencdata");
                parser.state = S.CDATA;
                parser.sgmlDecl = "";
                parser.cdata = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
                parser.state = S.DOCTYPE;
                if (parser.doctype || parser.sawRoot) {
                  strictFail(
                    parser,
                    "Inappropriately located doctype declaration"
                  );
                }
                parser.doctype = "";
                parser.sgmlDecl = "";
              } else if (c === ">") {
                emitNode(parser, "onsgmldeclaration", parser.sgmlDecl);
                parser.sgmlDecl = "";
                parser.state = S.TEXT;
              } else if (isQuote(c)) {
                parser.state = S.SGML_DECL_QUOTED;
                parser.sgmlDecl += c;
              } else {
                parser.sgmlDecl += c;
              }
              continue;
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL;
                parser.q = "";
              }
              parser.sgmlDecl += c;
              continue;
            case S.DOCTYPE:
              if (c === ">") {
                parser.state = S.TEXT;
                emitNode(parser, "ondoctype", parser.doctype);
                parser.doctype = true;
              } else {
                parser.doctype += c;
                if (c === "[") {
                  parser.state = S.DOCTYPE_DTD;
                } else if (isQuote(c)) {
                  parser.state = S.DOCTYPE_QUOTED;
                  parser.q = c;
                }
              }
              continue;
            case S.DOCTYPE_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.q = "";
                parser.state = S.DOCTYPE;
              }
              continue;
            case S.DOCTYPE_DTD:
              if (c === "]") {
                parser.doctype += c;
                parser.state = S.DOCTYPE;
              } else if (c === "<") {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else if (isQuote(c)) {
                parser.doctype += c;
                parser.state = S.DOCTYPE_DTD_QUOTED;
                parser.q = c;
              } else {
                parser.doctype += c;
              }
              continue;
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD;
                parser.q = "";
              }
              continue;
            case S.COMMENT:
              if (c === "-") {
                parser.state = S.COMMENT_ENDING;
              } else {
                parser.comment += c;
              }
              continue;
            case S.COMMENT_ENDING:
              if (c === "-") {
                parser.state = S.COMMENT_ENDED;
                parser.comment = textopts(parser.opt, parser.comment);
                if (parser.comment) {
                  emitNode(parser, "oncomment", parser.comment);
                }
                parser.comment = "";
              } else {
                parser.comment += "-" + c;
                parser.state = S.COMMENT;
              }
              continue;
            case S.COMMENT_ENDED:
              if (c !== ">") {
                strictFail(parser, "Malformed comment");
                parser.comment += "--" + c;
                parser.state = S.COMMENT;
              } else if (parser.doctype && parser.doctype !== true) {
                parser.state = S.DOCTYPE_DTD;
              } else {
                parser.state = S.TEXT;
              }
              continue;
            case S.CDATA:
              var starti = i - 1;
              while (c && c !== "]") {
                c = charAt(chunk, i++);
                if (c && parser.trackPosition) {
                  parser.position++;
                  if (c === "\n") {
                    parser.line++;
                    parser.column = 0;
                  } else {
                    parser.column++;
                  }
                }
              }
              parser.cdata += chunk.substring(starti, i - 1);
              if (c === "]") {
                parser.state = S.CDATA_ENDING;
              }
              continue;
            case S.CDATA_ENDING:
              if (c === "]") {
                parser.state = S.CDATA_ENDING_2;
              } else {
                parser.cdata += "]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.CDATA_ENDING_2:
              if (c === ">") {
                if (parser.cdata) {
                  emitNode(parser, "oncdata", parser.cdata);
                }
                emitNode(parser, "onclosecdata");
                parser.cdata = "";
                parser.state = S.TEXT;
              } else if (c === "]") {
                parser.cdata += "]";
              } else {
                parser.cdata += "]]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.PROC_INST:
              if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else if (isWhitespace(c)) {
                parser.state = S.PROC_INST_BODY;
              } else {
                parser.procInstName += c;
              }
              continue;
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && isWhitespace(c)) {
                continue;
              } else if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else {
                parser.procInstBody += c;
              }
              continue;
            case S.PROC_INST_ENDING:
              if (c === ">") {
                emitNode(parser, "onprocessinginstruction", {
                  name: parser.procInstName,
                  body: parser.procInstBody
                });
                parser.procInstName = parser.procInstBody = "";
                parser.state = S.TEXT;
              } else {
                parser.procInstBody += "?" + c;
                parser.state = S.PROC_INST_BODY;
              }
              continue;
            case S.OPEN_TAG:
              if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else {
                newTag(parser);
                if (c === ">") {
                  openTag(parser);
                } else if (c === "/") {
                  parser.state = S.OPEN_TAG_SLASH;
                } else {
                  if (!isWhitespace(c)) {
                    strictFail(parser, "Invalid character in tag name");
                  }
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.OPEN_TAG_SLASH:
              if (c === ">") {
                openTag(parser, true);
                closeTag(parser);
              } else {
                strictFail(
                  parser,
                  "Forward-slash in opening tag not followed by >"
                );
                parser.state = S.ATTRIB;
              }
              continue;
            case S.ATTRIB:
              if (isWhitespace(c)) {
                continue;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (c === ">") {
                strictFail(parser, "Attribute without value");
                parser.attribValue = parser.attribName;
                attrib(parser);
                openTag(parser);
              } else if (isWhitespace(c)) {
                parser.state = S.ATTRIB_NAME_SAW_WHITE;
              } else if (isMatch(nameBody, c)) {
                parser.attribName += c;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (isWhitespace(c)) {
                continue;
              } else {
                strictFail(parser, "Attribute without value");
                parser.tag.attributes[parser.attribName] = "";
                parser.attribValue = "";
                emitNode(parser, "onattribute", {
                  name: parser.attribName,
                  value: ""
                });
                parser.attribName = "";
                if (c === ">") {
                  openTag(parser);
                } else if (isMatch(nameStart, c)) {
                  parser.attribName = c;
                  parser.state = S.ATTRIB_NAME;
                } else {
                  strictFail(parser, "Invalid attribute name");
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.ATTRIB_VALUE:
              if (isWhitespace(c)) {
                continue;
              } else if (isQuote(c)) {
                parser.q = c;
                parser.state = S.ATTRIB_VALUE_QUOTED;
              } else {
                if (!parser.opt.unquotedAttributeValues) {
                  error(parser, "Unquoted attribute value");
                }
                parser.state = S.ATTRIB_VALUE_UNQUOTED;
                parser.attribValue = c;
              }
              continue;
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              parser.q = "";
              parser.state = S.ATTRIB_VALUE_CLOSED;
              continue;
            case S.ATTRIB_VALUE_CLOSED:
              if (isWhitespace(c)) {
                parser.state = S.ATTRIB;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                strictFail(parser, "No whitespace between attributes");
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_VALUE_UNQUOTED:
              if (!isAttribEnd(c)) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_U;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              if (c === ">") {
                openTag(parser);
              } else {
                parser.state = S.ATTRIB;
              }
              continue;
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (isWhitespace(c)) {
                  continue;
                } else if (notMatch(nameStart, c)) {
                  if (parser.script) {
                    parser.script += "</" + c;
                    parser.state = S.SCRIPT;
                  } else {
                    strictFail(parser, "Invalid tagname in closing tag.");
                  }
                } else {
                  parser.tagName = c;
                }
              } else if (c === ">") {
                closeTag(parser);
              } else if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else if (parser.script) {
                parser.script += "</" + parser.tagName + c;
                parser.tagName = "";
                parser.state = S.SCRIPT;
              } else {
                if (!isWhitespace(c)) {
                  strictFail(parser, "Invalid tagname in closing tag");
                }
                parser.state = S.CLOSE_TAG_SAW_WHITE;
              }
              continue;
            case S.CLOSE_TAG_SAW_WHITE:
              if (isWhitespace(c)) {
                continue;
              }
              if (c === ">") {
                closeTag(parser);
              } else {
                strictFail(parser, "Invalid characters in closing tag");
              }
              continue;
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              var returnState;
              var buffer2;
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  returnState = S.TEXT;
                  buffer2 = "textNode";
                  break;
                case S.ATTRIB_VALUE_ENTITY_Q:
                  returnState = S.ATTRIB_VALUE_QUOTED;
                  buffer2 = "attribValue";
                  break;
                case S.ATTRIB_VALUE_ENTITY_U:
                  returnState = S.ATTRIB_VALUE_UNQUOTED;
                  buffer2 = "attribValue";
                  break;
              }
              if (c === ";") {
                var parsedEntity = parseEntity(parser);
                if (parser.opt.unparsedEntities && !Object.values(sax.XML_ENTITIES).includes(parsedEntity)) {
                  if ((parser.entityCount += 1) > parser.opt.maxEntityCount) {
                    error(
                      parser,
                      "Parsed entity count exceeds max entity count"
                    );
                  }
                  if ((parser.entityDepth += 1) > parser.opt.maxEntityDepth) {
                    error(
                      parser,
                      "Parsed entity depth exceeds max entity depth"
                    );
                  }
                  parser.entity = "";
                  parser.state = returnState;
                  parser.write(parsedEntity);
                  parser.entityDepth -= 1;
                } else {
                  parser[buffer2] += parsedEntity;
                  parser.entity = "";
                  parser.state = returnState;
                }
              } else if (isMatch(parser.entity.length ? entityBody : entityStart, c)) {
                parser.entity += c;
              } else {
                strictFail(parser, "Invalid character in entity name");
                parser[buffer2] += "&" + parser.entity + c;
                parser.entity = "";
                parser.state = returnState;
              }
              continue;
            default: {
              throw new Error(parser, "Unknown state: " + parser.state);
            }
          }
        }
        if (parser.position >= parser.bufferCheckPosition) {
          checkBufferLength(parser);
        }
        return parser;
      }
      if (!String.fromCodePoint) {
        ;
        (function() {
          var stringFromCharCode = String.fromCharCode;
          var floor = Math.floor;
          var fromCodePoint = function() {
            var MAX_SIZE = 16384;
            var codeUnits = [];
            var highSurrogate;
            var lowSurrogate;
            var index = -1;
            var length = arguments.length;
            if (!length) {
              return "";
            }
            var result = "";
            while (++index < length) {
              var codePoint = Number(arguments[index]);
              if (!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
              codePoint < 0 || // not a valid Unicode code point
              codePoint > 1114111 || // not a valid Unicode code point
              floor(codePoint) !== codePoint) {
                throw RangeError("Invalid code point: " + codePoint);
              }
              if (codePoint <= 65535) {
                codeUnits.push(codePoint);
              } else {
                codePoint -= 65536;
                highSurrogate = (codePoint >> 10) + 55296;
                lowSurrogate = codePoint % 1024 + 56320;
                codeUnits.push(highSurrogate, lowSurrogate);
              }
              if (index + 1 === length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits);
                codeUnits.length = 0;
              }
            }
            return result;
          };
          if (Object.defineProperty) {
            Object.defineProperty(String, "fromCodePoint", {
              value: fromCodePoint,
              configurable: true,
              writable: true
            });
          } else {
            String.fromCodePoint = fromCodePoint;
          }
        })();
      }
    })(typeof exports2 === "undefined" ? exports2.sax = {} : exports2);
  }
});

// node_modules/builder-util-runtime/out/xml.js
var require_xml = __commonJS({
  "node_modules/builder-util-runtime/out/xml.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.XElement = void 0;
    exports2.parseXml = parseXml;
    var sax = require_sax();
    var error_1 = require_error();
    var XElement = class {
      constructor(name) {
        this.name = name;
        this.value = "";
        this.attributes = null;
        this.isCData = false;
        this.elements = null;
        if (!name) {
          throw (0, error_1.newError)("Element name cannot be empty", "ERR_XML_ELEMENT_NAME_EMPTY");
        }
        if (!isValidName(name)) {
          throw (0, error_1.newError)(`Invalid element name: ${name}`, "ERR_XML_ELEMENT_INVALID_NAME");
        }
      }
      attribute(name) {
        const result = this.attributes === null ? null : this.attributes[name];
        if (result == null) {
          throw (0, error_1.newError)(`No attribute "${name}"`, "ERR_XML_MISSED_ATTRIBUTE");
        }
        return result;
      }
      removeAttribute(name) {
        if (this.attributes !== null) {
          delete this.attributes[name];
        }
      }
      element(name, ignoreCase = false, errorIfMissed = null) {
        const result = this.elementOrNull(name, ignoreCase);
        if (result === null) {
          throw (0, error_1.newError)(errorIfMissed || `No element "${name}"`, "ERR_XML_MISSED_ELEMENT");
        }
        return result;
      }
      elementOrNull(name, ignoreCase = false) {
        if (this.elements === null) {
          return null;
        }
        for (const element of this.elements) {
          if (isNameEquals(element, name, ignoreCase)) {
            return element;
          }
        }
        return null;
      }
      getElements(name, ignoreCase = false) {
        if (this.elements === null) {
          return [];
        }
        return this.elements.filter((it) => isNameEquals(it, name, ignoreCase));
      }
      elementValueOrEmpty(name, ignoreCase = false) {
        const element = this.elementOrNull(name, ignoreCase);
        return element === null ? "" : element.value;
      }
    };
    exports2.XElement = XElement;
    var NAME_REG_EXP = new RegExp(/^[A-Za-z_][:A-Za-z0-9_-]*$/i);
    function isValidName(name) {
      return NAME_REG_EXP.test(name);
    }
    function isNameEquals(element, name, ignoreCase) {
      const elementName = element.name;
      return elementName === name || ignoreCase === true && elementName.length === name.length && elementName.toLowerCase() === name.toLowerCase();
    }
    function parseXml(data) {
      let rootElement = null;
      const parser = sax.parser(true, {});
      const elements = [];
      parser.onopentag = (saxElement) => {
        const element = new XElement(saxElement.name);
        element.attributes = saxElement.attributes;
        if (rootElement === null) {
          rootElement = element;
        } else {
          const parent = elements[elements.length - 1];
          if (parent.elements == null) {
            parent.elements = [];
          }
          parent.elements.push(element);
        }
        elements.push(element);
      };
      parser.onclosetag = () => {
        elements.pop();
      };
      parser.ontext = (text) => {
        if (elements.length > 0) {
          elements[elements.length - 1].value = text;
        }
      };
      parser.oncdata = (cdata) => {
        const element = elements[elements.length - 1];
        element.value = cdata;
        element.isCData = true;
      };
      parser.onerror = (err) => {
        throw err;
      };
      parser.write(data);
      return rootElement;
    }
  }
});

// node_modules/builder-util-runtime/out/index.js
var require_out = __commonJS({
  "node_modules/builder-util-runtime/out/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CURRENT_APP_PACKAGE_FILE_NAME = exports2.CURRENT_APP_INSTALLER_FILE_NAME = exports2.XElement = exports2.parseXml = exports2.UUID = exports2.parseDn = exports2.retry = exports2.githubTagPrefix = exports2.githubUrl = exports2.getS3LikeProviderBaseUrl = exports2.ProgressCallbackTransform = exports2.MemoLazy = exports2.safeStringifyJson = exports2.safeGetHeader = exports2.parseJson = exports2.HttpExecutor = exports2.HttpError = exports2.DigestTransform = exports2.createHttpError = exports2.configureRequestUrl = exports2.configureRequestOptionsFromUrl = exports2.configureRequestOptions = exports2.newError = exports2.CancellationToken = exports2.CancellationError = void 0;
    exports2.asArray = asArray;
    var CancellationToken_1 = require_CancellationToken();
    Object.defineProperty(exports2, "CancellationError", { enumerable: true, get: function() {
      return CancellationToken_1.CancellationError;
    } });
    Object.defineProperty(exports2, "CancellationToken", { enumerable: true, get: function() {
      return CancellationToken_1.CancellationToken;
    } });
    var error_1 = require_error();
    Object.defineProperty(exports2, "newError", { enumerable: true, get: function() {
      return error_1.newError;
    } });
    var httpExecutor_1 = require_httpExecutor();
    Object.defineProperty(exports2, "configureRequestOptions", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestOptions;
    } });
    Object.defineProperty(exports2, "configureRequestOptionsFromUrl", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestOptionsFromUrl;
    } });
    Object.defineProperty(exports2, "configureRequestUrl", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestUrl;
    } });
    Object.defineProperty(exports2, "createHttpError", { enumerable: true, get: function() {
      return httpExecutor_1.createHttpError;
    } });
    Object.defineProperty(exports2, "DigestTransform", { enumerable: true, get: function() {
      return httpExecutor_1.DigestTransform;
    } });
    Object.defineProperty(exports2, "HttpError", { enumerable: true, get: function() {
      return httpExecutor_1.HttpError;
    } });
    Object.defineProperty(exports2, "HttpExecutor", { enumerable: true, get: function() {
      return httpExecutor_1.HttpExecutor;
    } });
    Object.defineProperty(exports2, "parseJson", { enumerable: true, get: function() {
      return httpExecutor_1.parseJson;
    } });
    Object.defineProperty(exports2, "safeGetHeader", { enumerable: true, get: function() {
      return httpExecutor_1.safeGetHeader;
    } });
    Object.defineProperty(exports2, "safeStringifyJson", { enumerable: true, get: function() {
      return httpExecutor_1.safeStringifyJson;
    } });
    var MemoLazy_1 = require_MemoLazy();
    Object.defineProperty(exports2, "MemoLazy", { enumerable: true, get: function() {
      return MemoLazy_1.MemoLazy;
    } });
    var ProgressCallbackTransform_1 = require_ProgressCallbackTransform();
    Object.defineProperty(exports2, "ProgressCallbackTransform", { enumerable: true, get: function() {
      return ProgressCallbackTransform_1.ProgressCallbackTransform;
    } });
    var publishOptions_1 = require_publishOptions();
    Object.defineProperty(exports2, "getS3LikeProviderBaseUrl", { enumerable: true, get: function() {
      return publishOptions_1.getS3LikeProviderBaseUrl;
    } });
    Object.defineProperty(exports2, "githubUrl", { enumerable: true, get: function() {
      return publishOptions_1.githubUrl;
    } });
    Object.defineProperty(exports2, "githubTagPrefix", { enumerable: true, get: function() {
      return publishOptions_1.githubTagPrefix;
    } });
    var retry_1 = require_retry();
    Object.defineProperty(exports2, "retry", { enumerable: true, get: function() {
      return retry_1.retry;
    } });
    var rfc2253Parser_1 = require_rfc2253Parser();
    Object.defineProperty(exports2, "parseDn", { enumerable: true, get: function() {
      return rfc2253Parser_1.parseDn;
    } });
    var uuid_1 = require_uuid();
    Object.defineProperty(exports2, "UUID", { enumerable: true, get: function() {
      return uuid_1.UUID;
    } });
    var xml_1 = require_xml();
    Object.defineProperty(exports2, "parseXml", { enumerable: true, get: function() {
      return xml_1.parseXml;
    } });
    Object.defineProperty(exports2, "XElement", { enumerable: true, get: function() {
      return xml_1.XElement;
    } });
    exports2.CURRENT_APP_INSTALLER_FILE_NAME = "installer.exe";
    exports2.CURRENT_APP_PACKAGE_FILE_NAME = "package.7z";
    function asArray(v) {
      if (v == null) {
        return [];
      } else if (Array.isArray(v)) {
        return v;
      } else {
        return [v];
      }
    }
  }
});

// node_modules/js-yaml/lib/common.js
var require_common2 = __commonJS({
  "node_modules/js-yaml/lib/common.js"(exports2, module2) {
    "use strict";
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    function isObject(subject) {
      return typeof subject === "object" && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence)) return sequence;
      else if (isNothing(sequence)) return [];
      return [sequence];
    }
    function extend(target, source) {
      var index, length, key, sourceKeys;
      if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
          key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      var result = "", cycle;
      for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    module2.exports.isNothing = isNothing;
    module2.exports.isObject = isObject;
    module2.exports.toArray = toArray;
    module2.exports.repeat = repeat;
    module2.exports.isNegativeZero = isNegativeZero;
    module2.exports.extend = extend;
  }
});

// node_modules/js-yaml/lib/exception.js
var require_exception = __commonJS({
  "node_modules/js-yaml/lib/exception.js"(exports2, module2) {
    "use strict";
    function formatError(exception, compact) {
      var where = "", message = exception.reason || "(unknown reason)";
      if (!exception.mark) return message;
      if (exception.mark.name) {
        where += 'in "' + exception.mark.name + '" ';
      }
      where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
      if (!compact && exception.mark.snippet) {
        where += "\n\n" + exception.mark.snippet;
      }
      return message + " " + where;
    }
    function YAMLException(reason, mark) {
      Error.call(this);
      this.name = "YAMLException";
      this.reason = reason;
      this.mark = mark;
      this.message = formatError(this, false);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack || "";
      }
    }
    YAMLException.prototype = Object.create(Error.prototype);
    YAMLException.prototype.constructor = YAMLException;
    YAMLException.prototype.toString = function toString(compact) {
      return this.name + ": " + formatError(this, compact);
    };
    module2.exports = YAMLException;
  }
});

// node_modules/js-yaml/lib/snippet.js
var require_snippet = __commonJS({
  "node_modules/js-yaml/lib/snippet.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    function getLine(buffer2, lineStart, lineEnd, position, maxLineLength) {
      var head = "";
      var tail = "";
      var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
      if (position - lineStart > maxHalfLength) {
        head = " ... ";
        lineStart = position - maxHalfLength + head.length;
      }
      if (lineEnd - position > maxHalfLength) {
        tail = " ...";
        lineEnd = position + maxHalfLength - tail.length;
      }
      return {
        str: head + buffer2.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
        pos: position - lineStart + head.length
        // relative position
      };
    }
    function padStart(string, max) {
      return common.repeat(" ", max - string.length) + string;
    }
    function makeSnippet(mark, options) {
      options = Object.create(options || null);
      if (!mark.buffer) return null;
      if (!options.maxLength) options.maxLength = 79;
      if (typeof options.indent !== "number") options.indent = 1;
      if (typeof options.linesBefore !== "number") options.linesBefore = 3;
      if (typeof options.linesAfter !== "number") options.linesAfter = 2;
      var re = /\r?\n|\r|\0/g;
      var lineStarts = [0];
      var lineEnds = [];
      var match;
      var foundLineNo = -1;
      while (match = re.exec(mark.buffer)) {
        lineEnds.push(match.index);
        lineStarts.push(match.index + match[0].length);
        if (mark.position <= match.index && foundLineNo < 0) {
          foundLineNo = lineStarts.length - 2;
        }
      }
      if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
      var result = "", i, line;
      var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
      var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
      for (i = 1; i <= options.linesBefore; i++) {
        if (foundLineNo - i < 0) break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo - i],
          lineEnds[foundLineNo - i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
          maxLineLength
        );
        result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
      }
      line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
      result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
      for (i = 1; i <= options.linesAfter; i++) {
        if (foundLineNo + i >= lineEnds.length) break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo + i],
          lineEnds[foundLineNo + i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
          maxLineLength
        );
        result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      }
      return result.replace(/\n$/, "");
    }
    module2.exports = makeSnippet;
  }
});

// node_modules/js-yaml/lib/type.js
var require_type = __commonJS({
  "node_modules/js-yaml/lib/type.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var TYPE_CONSTRUCTOR_OPTIONS = [
      "kind",
      "multi",
      "resolve",
      "construct",
      "instanceOf",
      "predicate",
      "represent",
      "representName",
      "defaultStyle",
      "styleAliases"
    ];
    var YAML_NODE_KINDS = [
      "scalar",
      "sequence",
      "mapping"
    ];
    function compileStyleAliases(map) {
      var result = {};
      if (map !== null) {
        Object.keys(map).forEach(function(style) {
          map[style].forEach(function(alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type(tag, options) {
      options = options || {};
      Object.keys(options).forEach(function(name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });
      this.options = options;
      this.tag = tag;
      this.kind = options["kind"] || null;
      this.resolve = options["resolve"] || function() {
        return true;
      };
      this.construct = options["construct"] || function(data) {
        return data;
      };
      this.instanceOf = options["instanceOf"] || null;
      this.predicate = options["predicate"] || null;
      this.represent = options["represent"] || null;
      this.representName = options["representName"] || null;
      this.defaultStyle = options["defaultStyle"] || null;
      this.multi = options["multi"] || false;
      this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    module2.exports = Type;
  }
});

// node_modules/js-yaml/lib/schema.js
var require_schema = __commonJS({
  "node_modules/js-yaml/lib/schema.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var Type = require_type();
    function compileList(schema, name) {
      var result = [];
      schema[name].forEach(function(currentType) {
        var newIndex = result.length;
        result.forEach(function(previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
            newIndex = previousIndex;
          }
        });
        result[newIndex] = currentType;
      });
      return result;
    }
    function compileMap() {
      var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {},
        multi: {
          scalar: [],
          sequence: [],
          mapping: [],
          fallback: []
        }
      }, index, length;
      function collectType(type) {
        if (type.multi) {
          result.multi[type.kind].push(type);
          result.multi["fallback"].push(type);
        } else {
          result[type.kind][type.tag] = result["fallback"][type.tag] = type;
        }
      }
      for (index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema(definition) {
      return this.extend(definition);
    }
    Schema.prototype.extend = function extend(definition) {
      var implicit = [];
      var explicit = [];
      if (definition instanceof Type) {
        explicit.push(definition);
      } else if (Array.isArray(definition)) {
        explicit = explicit.concat(definition);
      } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
        if (definition.implicit) implicit = implicit.concat(definition.implicit);
        if (definition.explicit) explicit = explicit.concat(definition.explicit);
      } else {
        throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
      }
      implicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
        if (type.loadKind && type.loadKind !== "scalar") {
          throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        }
        if (type.multi) {
          throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
        }
      });
      explicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
      });
      var result = Object.create(Schema.prototype);
      result.implicit = (this.implicit || []).concat(implicit);
      result.explicit = (this.explicit || []).concat(explicit);
      result.compiledImplicit = compileList(result, "implicit");
      result.compiledExplicit = compileList(result, "explicit");
      result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
      return result;
    };
    module2.exports = Schema;
  }
});

// node_modules/js-yaml/lib/type/str.js
var require_str = __commonJS({
  "node_modules/js-yaml/lib/type/str.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:str", {
      kind: "scalar",
      construct: function(data) {
        return data !== null ? data : "";
      }
    });
  }
});

// node_modules/js-yaml/lib/type/seq.js
var require_seq = __commonJS({
  "node_modules/js-yaml/lib/type/seq.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:seq", {
      kind: "sequence",
      construct: function(data) {
        return data !== null ? data : [];
      }
    });
  }
});

// node_modules/js-yaml/lib/type/map.js
var require_map = __commonJS({
  "node_modules/js-yaml/lib/type/map.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:map", {
      kind: "mapping",
      construct: function(data) {
        return data !== null ? data : {};
      }
    });
  }
});

// node_modules/js-yaml/lib/schema/failsafe.js
var require_failsafe = __commonJS({
  "node_modules/js-yaml/lib/schema/failsafe.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      explicit: [
        require_str(),
        require_seq(),
        require_map()
      ]
    });
  }
});

// node_modules/js-yaml/lib/type/null.js
var require_null = __commonJS({
  "node_modules/js-yaml/lib/type/null.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlNull(data) {
      if (data === null) return true;
      var max = data.length;
      return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:null", {
      kind: "scalar",
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function() {
          return "~";
        },
        lowercase: function() {
          return "null";
        },
        uppercase: function() {
          return "NULL";
        },
        camelcase: function() {
          return "Null";
        },
        empty: function() {
          return "";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/type/bool.js
var require_bool = __commonJS({
  "node_modules/js-yaml/lib/type/bool.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlBoolean(data) {
      if (data === null) return false;
      var max = data.length;
      return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === "[object Boolean]";
    }
    module2.exports = new Type("tag:yaml.org,2002:bool", {
      kind: "scalar",
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function(object) {
          return object ? "true" : "false";
        },
        uppercase: function(object) {
          return object ? "TRUE" : "FALSE";
        },
        camelcase: function(object) {
          return object ? "True" : "False";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/type/int.js
var require_int = __commonJS({
  "node_modules/js-yaml/lib/type/int.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var Type = require_type();
    function isHexCode(c) {
      return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
    }
    function isOctCode(c) {
      return 48 <= c && c <= 55;
    }
    function isDecCode(c) {
      return 48 <= c && c <= 57;
    }
    function resolveYamlInteger(data) {
      if (data === null) return false;
      var max = data.length, index = 0, hasDigits = false, ch;
      if (!max) return false;
      ch = data[index];
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        if (index + 1 === max) return true;
        ch = data[++index];
        if (ch === "b") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (ch !== "0" && ch !== "1") return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "x") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isHexCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "o") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isOctCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
      }
      if (ch === "_") return false;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      if (!hasDigits || ch === "_") return false;
      return true;
    }
    function constructYamlInteger(data) {
      var value = data, sign2 = 1, ch;
      if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
      }
      ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-") sign2 = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0") return 0;
      if (ch === "0") {
        if (value[1] === "b") return sign2 * parseInt(value.slice(2), 2);
        if (value[1] === "x") return sign2 * parseInt(value.slice(2), 16);
        if (value[1] === "o") return sign2 * parseInt(value.slice(2), 8);
      }
      return sign2 * parseInt(value, 10);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:int", {
      kind: "scalar",
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function(obj) {
          return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
        },
        octal: function(obj) {
          return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
        },
        decimal: function(obj) {
          return obj.toString(10);
        },
        /* eslint-disable max-len */
        hexadecimal: function(obj) {
          return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: "decimal",
      styleAliases: {
        binary: [2, "bin"],
        octal: [8, "oct"],
        decimal: [10, "dec"],
        hexadecimal: [16, "hex"]
      }
    });
  }
});

// node_modules/js-yaml/lib/type/float.js
var require_float = __commonJS({
  "node_modules/js-yaml/lib/type/float.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var Type = require_type();
    var YAML_FLOAT_PATTERN = new RegExp(
      // 2.5e4, 2.5 and integers
      "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    function resolveYamlFloat(data) {
      if (data === null) return false;
      if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === "_") {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      var value, sign2;
      value = data.replace(/_/g, "").toLowerCase();
      sign2 = value[0] === "-" ? -1 : 1;
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign2 === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === ".nan") {
        return NaN;
      }
      return sign2 * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      var res;
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (common.isNegativeZero(object)) {
        return "-0.0";
      }
      res = object.toString(10);
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:float", {
      kind: "scalar",
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/schema/json.js
var require_json2 = __commonJS({
  "node_modules/js-yaml/lib/schema/json.js"(exports2, module2) {
    "use strict";
    module2.exports = require_failsafe().extend({
      implicit: [
        require_null(),
        require_bool(),
        require_int(),
        require_float()
      ]
    });
  }
});

// node_modules/js-yaml/lib/schema/core.js
var require_core = __commonJS({
  "node_modules/js-yaml/lib/schema/core.js"(exports2, module2) {
    "use strict";
    module2.exports = require_json2();
  }
});

// node_modules/js-yaml/lib/type/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/js-yaml/lib/type/timestamp.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var YAML_DATE_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
    );
    var YAML_TIMESTAMP_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
    );
    function resolveYamlTimestamp(data) {
      if (data === null) return false;
      if (YAML_DATE_REGEXP.exec(data) !== null) return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
      match = YAML_DATE_REGEXP.exec(data);
      if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null) throw new Error("Date resolve error");
      year = +match[1];
      month = +match[2] - 1;
      day = +match[3];
      if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
      }
      hour = +match[4];
      minute = +match[5];
      second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          fraction += "0";
        }
        fraction = +fraction;
      }
      if (match[9]) {
        tz_hour = +match[10];
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 6e4;
        if (match[9] === "-") delta = -delta;
      }
      date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta) date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object) {
      return object.toISOString();
    }
    module2.exports = new Type("tag:yaml.org,2002:timestamp", {
      kind: "scalar",
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });
  }
});

// node_modules/js-yaml/lib/type/merge.js
var require_merge = __commonJS({
  "node_modules/js-yaml/lib/type/merge.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:merge", {
      kind: "scalar",
      resolve: resolveYamlMerge
    });
  }
});

// node_modules/js-yaml/lib/type/binary.js
var require_binary = __commonJS({
  "node_modules/js-yaml/lib/type/binary.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
    function resolveYamlBinary(data) {
      if (data === null) return false;
      var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        if (code > 64) continue;
        if (code < 0) return false;
        bitlen += 6;
      }
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
      for (idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }
      tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
      }
      return new Uint8Array(result);
    }
    function representYamlBinary(object) {
      var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
      }
      tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(obj) {
      return Object.prototype.toString.call(obj) === "[object Uint8Array]";
    }
    module2.exports = new Type("tag:yaml.org,2002:binary", {
      kind: "scalar",
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });
  }
});

// node_modules/js-yaml/lib/type/omap.js
var require_omap = __commonJS({
  "node_modules/js-yaml/lib/type/omap.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var _toString = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null) return true;
      var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") return false;
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey) pairHasKey = true;
            else return false;
          }
        }
        if (!pairHasKey) return false;
        if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
        else return false;
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    module2.exports = new Type("tag:yaml.org,2002:omap", {
      kind: "sequence",
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });
  }
});

// node_modules/js-yaml/lib/type/pairs.js
var require_pairs = __commonJS({
  "node_modules/js-yaml/lib/type/pairs.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _toString = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null) return true;
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        if (_toString.call(pair) !== "[object Object]") return false;
        keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) return [];
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    module2.exports = new Type("tag:yaml.org,2002:pairs", {
      kind: "sequence",
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });
  }
});

// node_modules/js-yaml/lib/type/set.js
var require_set = __commonJS({
  "node_modules/js-yaml/lib/type/set.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null) return true;
      var key, object = data;
      for (key in object) {
        if (_hasOwnProperty.call(object, key)) {
          if (object[key] !== null) return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    module2.exports = new Type("tag:yaml.org,2002:set", {
      kind: "mapping",
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });
  }
});

// node_modules/js-yaml/lib/schema/default.js
var require_default = __commonJS({
  "node_modules/js-yaml/lib/schema/default.js"(exports2, module2) {
    "use strict";
    module2.exports = require_core().extend({
      implicit: [
        require_timestamp(),
        require_merge()
      ],
      explicit: [
        require_binary(),
        require_omap(),
        require_pairs(),
        require_set()
      ]
    });
  }
});

// node_modules/js-yaml/lib/loader.js
var require_loader = __commonJS({
  "node_modules/js-yaml/lib/loader.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var YAMLException = require_exception();
    var makeSnippet = require_snippet();
    var DEFAULT_SCHEMA = require_default();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function is_EOL(c) {
      return c === 10 || c === 13;
    }
    function is_WHITE_SPACE(c) {
      return c === 9 || c === 32;
    }
    function is_WS_OR_EOL(c) {
      return c === 9 || c === 32 || c === 10 || c === 13;
    }
    function is_FLOW_INDICATOR(c) {
      return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
    }
    function fromHexCode(c) {
      var lc;
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      lc = c | 32;
      if (97 <= lc && lc <= 102) {
        return lc - 97 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 120) {
        return 2;
      }
      if (c === 117) {
        return 4;
      }
      if (c === 85) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
    }
    function charFromCodepoint(c) {
      if (c <= 65535) {
        return String.fromCharCode(c);
      }
      return String.fromCharCode(
        (c - 65536 >> 10) + 55296,
        (c - 65536 & 1023) + 56320
      );
    }
    function setProperty(object, key, value) {
      if (key === "__proto__") {
        Object.defineProperty(object, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value
        });
      } else {
        object[key] = value;
      }
    }
    var simpleEscapeCheck = new Array(256);
    var simpleEscapeMap = new Array(256);
    for (i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    var i;
    function State(input, options) {
      this.input = input;
      this.filename = options["filename"] || null;
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.onWarning = options["onWarning"] || null;
      this.legacy = options["legacy"] || false;
      this.json = options["json"] || false;
      this.listener = options["listener"] || null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.firstTabInLine = -1;
      this.documents = [];
    }
    function generateError(state, message) {
      var mark = {
        name: state.filename,
        buffer: state.input.slice(0, -1),
        // omit trailing \0
        position: state.position,
        line: state.line,
        column: state.position - state.lineStart
      };
      mark.snippet = makeSnippet(mark);
      return new YAMLException(message, mark);
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        var match, major, minor;
        if (state.version !== null) {
          throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
          throwError(state, "YAML directive accepts exactly one argument");
        }
        match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, "ill-formed argument of the YAML directive");
        }
        major = parseInt(match[1], 10);
        minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, "unsupported YAML version of the document");
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        var handle, prefix;
        if (args.length !== 2) {
          throwError(state, "TAG directive accepts exactly two arguments");
        }
        handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        try {
          prefix = decodeURIComponent(prefix);
        } catch (err) {
          throwError(state, "tag prefix is malformed: " + prefix);
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      var _position, _length, _character, _result;
      if (start < end) {
        _result = state.input.slice(start, end);
        if (checkJson) {
          for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
            _character = _result.charCodeAt(_position);
            if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
              throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, "the stream contains non-printable characters");
        }
        state.result += _result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      var sourceKeys, key, index, quantity;
      if (!common.isObject(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
      }
      sourceKeys = Object.keys(source);
      for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        key = sourceKeys[index];
        if (!_hasOwnProperty.call(destination, key)) {
          setProperty(destination, key, source[key]);
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
      var index, quantity;
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, "nested arrays are not supported inside keys");
          }
          if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
            keyNode[index] = "[object Object]";
          }
        }
      }
      if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.lineStart = startLineStart || state.lineStart;
          state.position = startPos || state.position;
          throwError(state, "duplicated mapping key");
        }
        setProperty(_result, keyNode, valueNode);
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      var ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 10) {
        state.position++;
      } else if (ch === 13) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 10) {
          state.position++;
        }
      } else {
        throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
      state.firstTabInLine = -1;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          if (ch === 9 && state.firstTabInLine === -1) {
            state.firstTabInLine = state.position;
          }
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 10 && ch !== 13 && ch !== 0);
        }
        if (is_EOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      var _position = state.position, ch;
      ch = state.input.charCodeAt(_position);
      if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || is_WS_OR_EOL(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
      ch = state.input.charCodeAt(state.position);
      if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
      }
      if (ch === 63 || ch === 45) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 58) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            break;
          }
        } else if (ch === 35) {
          preceding = state.input.charCodeAt(state.position - 1);
          if (is_WS_OR_EOL(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
          break;
        } else if (is_EOL(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!is_WHITE_SPACE(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      var ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 39) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 39) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 39) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a single quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a single quoted scalar");
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 34) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 34) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 92) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (is_EOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            hexLength = tmp;
            hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a double quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a double quoted scalar");
    }
    function readFlowCollection(state, nodeIndent) {
      var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 91) {
        terminator = 93;
        isMapping = false;
        _result = [];
      } else if (ch === 123) {
        terminator = 125;
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, "missed comma between flow collection entries");
        } else if (ch === 44) {
          throwError(state, "expected the node content, but found ','");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        _lineStart = state.lineStart;
        _pos = state.position;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 58) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 44) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, "unexpected end of the stream within a flow collection");
    }
    function readBlockScalar(state, nodeIndent) {
      var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 124) {
        folding = false;
      } else if (ch === 62) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 43 || ch === 45) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, "repeat of an indentation width identifier");
          }
        } else {
          break;
        }
      }
      if (is_WHITE_SPACE(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (is_WHITE_SPACE(ch));
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!is_EOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (is_EOL(ch)) {
          emptyLines++;
          continue;
        }
        if (state.lineIndent < textIndent) {
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              state.result += "\n";
            }
          }
          break;
        }
        if (folding) {
          if (is_WHITE_SPACE(ch)) {
            atMoreIndented = true;
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
          } else if (emptyLines === 0) {
            if (didReadContent) {
              state.result += " ";
            }
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
        } else {
          state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        captureStart = state.position;
        while (!is_EOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        if (ch !== 45) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!is_WS_OR_EOL(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (!atExplicitKey && state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        following = state.input.charCodeAt(state.position + 1);
        _line = state.line;
        if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
          if (ch === 63) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
          }
          state.position += 1;
          ch = following;
        } else {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
          if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
            break;
          }
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 58) {
              ch = state.input.charCodeAt(++state.position);
              if (!is_WS_OR_EOL(ch)) {
                throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, "can not read an implicit mapping pair; a colon is missed");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          } else if (detected) {
            throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        }
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (atExplicitKey) {
            _keyLine = state.line;
            _keyLineStart = state.lineStart;
            _keyPos = state.position;
          }
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 33) return false;
      if (state.tag !== null) {
        throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 60) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 62);
        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, "unexpected end of the stream within a verbatim tag");
        }
      } else {
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          if (ch === 33) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, "named tag handle cannot contain such characters");
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, "tag suffix cannot contain exclamation marks");
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, "tag suffix cannot contain flow indicator characters");
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, "tag name cannot contain such characters: " + tagName);
      }
      try {
        tagName = decodeURIComponent(tagName);
      } catch (err) {
        throwError(state, "tag name is malformed: " + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = "!" + tagName;
      } else if (tagHandle === "!!") {
        state.tag = "tag:yaml.org,2002:" + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      var _position, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 38) return false;
      if (state.anchor !== null) {
        throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      var _position, alias, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 42) return false;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
      }
      alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type, flowIndent, blockIndent;
      if (state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, "alias node should not have any properties");
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag === null) {
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      } else if (state.tag === "?") {
        if (state.result !== null && state.kind !== "scalar") {
          throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
        }
        for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];
          if (type.resolve(state.result)) {
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
            break;
          }
        }
      } else if (state.tag !== "!") {
        if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
        } else {
          type = null;
          typeList = state.typeMap.multi[state.kind || "fallback"];
          for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
            if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
              type = typeList[typeIndex];
              break;
            }
          }
        }
        if (!type) {
          throwError(state, "unknown tag !<" + state.tag + ">");
        }
        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }
        if (!type.resolve(state.result, state.tag)) {
          throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
        } else {
          state.result = type.construct(state.result, state.tag);
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      }
      if (state.listener !== null) {
        state.listener("close", state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = /* @__PURE__ */ Object.create(null);
      state.anchorMap = /* @__PURE__ */ Object.create(null);
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 37) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(_position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !is_EOL(ch));
            break;
          }
          if (is_EOL(ch)) break;
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0) readLineBreak(state);
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 46) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, "end of the stream or a document separator is expected");
      } else {
        return;
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
          input += "\n";
        }
        if (input.charCodeAt(0) === 65279) {
          input = input.slice(1);
        }
      }
      var state = new State(input, options);
      var nullpos = input.indexOf("\0");
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, "null byte is not allowed in input");
      }
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 32) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll(input, iterator, options) {
      if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
        options = iterator;
        iterator = null;
      }
      var documents = loadDocuments(input, options);
      if (typeof iterator !== "function") {
        return documents;
      }
      for (var index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load(input, options) {
      var documents = loadDocuments(input, options);
      if (documents.length === 0) {
        return void 0;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new YAMLException("expected a single document in the stream, but found more");
    }
    module2.exports.loadAll = loadAll;
    module2.exports.load = load;
  }
});

// node_modules/js-yaml/lib/dumper.js
var require_dumper = __commonJS({
  "node_modules/js-yaml/lib/dumper.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var YAMLException = require_exception();
    var DEFAULT_SCHEMA = require_default();
    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_BOM = 65279;
    var CHAR_TAB = 9;
    var CHAR_LINE_FEED = 10;
    var CHAR_CARRIAGE_RETURN = 13;
    var CHAR_SPACE = 32;
    var CHAR_EXCLAMATION = 33;
    var CHAR_DOUBLE_QUOTE = 34;
    var CHAR_SHARP = 35;
    var CHAR_PERCENT = 37;
    var CHAR_AMPERSAND = 38;
    var CHAR_SINGLE_QUOTE = 39;
    var CHAR_ASTERISK = 42;
    var CHAR_COMMA = 44;
    var CHAR_MINUS = 45;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_GREATER_THAN = 62;
    var CHAR_QUESTION = 63;
    var CHAR_COMMERCIAL_AT = 64;
    var CHAR_LEFT_SQUARE_BRACKET = 91;
    var CHAR_RIGHT_SQUARE_BRACKET = 93;
    var CHAR_GRAVE_ACCENT = 96;
    var CHAR_LEFT_CURLY_BRACKET = 123;
    var CHAR_VERTICAL_LINE = 124;
    var CHAR_RIGHT_CURLY_BRACKET = 125;
    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0] = "\\0";
    ESCAPE_SEQUENCES[7] = "\\a";
    ESCAPE_SEQUENCES[8] = "\\b";
    ESCAPE_SEQUENCES[9] = "\\t";
    ESCAPE_SEQUENCES[10] = "\\n";
    ESCAPE_SEQUENCES[11] = "\\v";
    ESCAPE_SEQUENCES[12] = "\\f";
    ESCAPE_SEQUENCES[13] = "\\r";
    ESCAPE_SEQUENCES[27] = "\\e";
    ESCAPE_SEQUENCES[34] = '\\"';
    ESCAPE_SEQUENCES[92] = "\\\\";
    ESCAPE_SEQUENCES[133] = "\\N";
    ESCAPE_SEQUENCES[160] = "\\_";
    ESCAPE_SEQUENCES[8232] = "\\L";
    ESCAPE_SEQUENCES[8233] = "\\P";
    var DEPRECATED_BOOLEANS_SYNTAX = [
      "y",
      "Y",
      "yes",
      "Yes",
      "YES",
      "on",
      "On",
      "ON",
      "n",
      "N",
      "no",
      "No",
      "NO",
      "off",
      "Off",
      "OFF"
    ];
    var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
    function compileStyleMap(schema, map) {
      var result, keys, index, length, tag, style, type;
      if (map === null) return {};
      result = {};
      keys = Object.keys(map);
      for (index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = "tag:yaml.org,2002:" + tag.slice(2);
        }
        type = schema.compiledTypeMap["fallback"][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      var string, handle, length;
      string = character.toString(16).toUpperCase();
      if (character <= 255) {
        handle = "x";
        length = 2;
      } else if (character <= 65535) {
        handle = "u";
        length = 4;
      } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
      } else {
        throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
      }
      return "\\" + handle + common.repeat("0", length - string.length) + string;
    }
    var QUOTING_TYPE_SINGLE = 1;
    var QUOTING_TYPE_DOUBLE = 2;
    function State(options) {
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.indent = Math.max(1, options["indent"] || 2);
      this.noArrayIndent = options["noArrayIndent"] || false;
      this.skipInvalid = options["skipInvalid"] || false;
      this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
      this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
      this.sortKeys = options["sortKeys"] || false;
      this.lineWidth = options["lineWidth"] || 80;
      this.noRefs = options["noRefs"] || false;
      this.noCompatMode = options["noCompatMode"] || false;
      this.condenseFlow = options["condenseFlow"] || false;
      this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
      this.forceQuotes = options["forceQuotes"] || false;
      this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = "";
      this.duplicates = [];
      this.usedDuplicates = null;
    }
    function indentString(string, spaces) {
      var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
      while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n") result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return "\n" + common.repeat(" ", state.indent * level);
    }
    function testImplicitResolving(state, str) {
      var index, length, type;
      for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    function isPrintable(c) {
      return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
    }
    function isNsCharOrWhitespace(c) {
      return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }
    function isPlainSafe(c, prev, inblock) {
      var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
      var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
      return (
        // ns-plain-safe
        (inblock ? (
          // c = flow-in
          cIsNsCharOrWhitespace
        ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
      );
    }
    function isPlainSafeFirst(c) {
      return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }
    function isPlainSafeLast(c) {
      return !isWhitespace(c) && c !== CHAR_COLON;
    }
    function codePointAt(string, pos) {
      var first = string.charCodeAt(pos), second;
      if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
        second = string.charCodeAt(pos + 1);
        if (second >= 56320 && second <= 57343) {
          return (first - 55296) * 1024 + second - 56320 + 65536;
        }
      }
      return first;
    }
    function needIndentIndicator(string) {
      var leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1;
    var STYLE_SINGLE = 2;
    var STYLE_LITERAL = 3;
    var STYLE_FOLDED = 4;
    var STYLE_DOUBLE = 5;
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
      var i;
      var char = 0;
      var prevChar = null;
      var hasLineBreak = false;
      var hasFoldableLine = false;
      var shouldTrackWidth = lineWidth !== -1;
      var previousLineBreak = -1;
      var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
      if (singleLineOnly || forceQuotes) {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
      } else {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
      }
      if (!hasLineBreak && !hasFoldableLine) {
        if (plain && !forceQuotes && !testAmbiguousType(string)) {
          return STYLE_PLAIN;
        }
        return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
      }
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      if (!forceQuotes) {
        return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    function writeScalar(state, string, level, iskey, inblock) {
      state.dump = (function() {
        if (string.length === 0) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
        }
        if (!state.noCompatMode) {
          if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
            return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
          }
        }
        var indent = state.indent * Math.max(1, level);
        var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string2) {
          return testImplicitResolving(state, string2);
        }
        switch (chooseScalarStyle(
          string,
          singleLineOnly,
          state.indent,
          lineWidth,
          testAmbiguity,
          state.quotingType,
          state.forceQuotes && !iskey,
          inblock
        )) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string, lineWidth) + '"';
          default:
            throw new YAMLException("impossible error: invalid scalar style");
        }
      })();
    }
    function blockHeader(string, indentPerLevel) {
      var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
      var clip = string[string.length - 1] === "\n";
      var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
      var chomp = keep ? "+" : clip ? "" : "-";
      return indentIndicator + chomp + "\n";
    }
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    function foldString(string, width) {
      var lineRe = /(\n+)([^\n]*)/g;
      var result = (function() {
        var nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      })();
      var prevMoreIndented = string[0] === "\n" || string[0] === " ";
      var moreIndented;
      var match;
      while (match = lineRe.exec(string)) {
        var prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    function foldLine(line, width) {
      if (line === "" || line[0] === " ") return line;
      var breakRe = / [^ ]/g;
      var match;
      var start = 0, end, curr = 0, next = 0;
      var result = "";
      while (match = breakRe.exec(line)) {
        next = match.index;
        if (next - start > width) {
          end = curr > start ? curr : next;
          result += "\n" + line.slice(start, end);
          start = end + 1;
        }
        curr = next;
      }
      result += "\n";
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1);
    }
    function escapeString(string) {
      var result = "";
      var char = 0;
      var escapeSeq;
      for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        escapeSeq = ESCAPE_SEQUENCES[char];
        if (!escapeSeq && isPrintable(char)) {
          result += string[i];
          if (char >= 65536) result += string[i + 1];
        } else {
          result += escapeSeq || encodeHex(char);
        }
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
          if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = "[" + _result + "]";
    }
    function writeBlockSequence(state, level, object, compact) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
          if (!compact || _result !== "") {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]";
    }
    function writeFlowMapping(state, level, object) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (_result !== "") pairBuffer += ", ";
        if (state.condenseFlow) pairBuffer += '"';
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level, objectKey, false, false)) {
          continue;
        }
        if (state.dump.length > 1024) pairBuffer += "? ";
        pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
        if (!writeNode(state, level, objectValue, false, false)) {
          continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = "{" + _result + "}";
    }
    function writeBlockMapping(state, level, object, compact) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
      if (state.sortKeys === true) {
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        throw new YAMLException("sortKeys must be a boolean or a function");
      }
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (!compact || _result !== "") {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue;
        }
        explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}";
    }
    function detectType(state, object, explicit) {
      var _result, typeList, index, length, type, style;
      typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          if (explicit) {
            if (type.multi && type.representName) {
              state.tag = type.representName(object);
            } else {
              state.tag = type.tag;
            }
          } else {
            state.tag = "?";
          }
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    function writeNode(state, level, object, block, compact, iskey, isblockseq) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      var type = _toString.call(state.dump);
      var inblock = block;
      var tagStr;
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = "*ref_" + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object Array]") {
          if (block && state.dump.length !== 0) {
            if (state.noArrayIndent && !isblockseq && level > 0) {
              writeBlockSequence(state, level - 1, state.dump, compact);
            } else {
              writeBlockSequence(state, level, state.dump, compact);
            }
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey, inblock);
          }
        } else if (type === "[object Undefined]") {
          return false;
        } else {
          if (state.skipInvalid) return false;
          throw new YAMLException("unacceptable kind of an object to dump " + type);
        }
        if (state.tag !== null && state.tag !== "?") {
          tagStr = encodeURI(
            state.tag[0] === "!" ? state.tag.slice(1) : state.tag
          ).replace(/!/g, "%21");
          if (state.tag[0] === "!") {
            tagStr = "!" + tagStr;
          } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
            tagStr = "!!" + tagStr.slice(18);
          } else {
            tagStr = "!<" + tagStr + ">";
          }
          state.dump = tagStr + " " + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      var objects = [], duplicatesIndexes = [], index, length;
      inspectNode(object, objects, duplicatesIndexes);
      for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      var objectKeyList, index, length;
      if (object !== null && typeof object === "object") {
        index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (index = 0, length = object.length; index < length; index += 1) {
              inspectNode(object[index], objects, duplicatesIndexes);
            }
          } else {
            objectKeyList = Object.keys(object);
            for (index = 0, length = objectKeyList.length; index < length; index += 1) {
              inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump(input, options) {
      options = options || {};
      var state = new State(options);
      if (!state.noRefs) getDuplicateReferences(input, state);
      var value = input;
      if (state.replacer) {
        value = state.replacer.call({ "": value }, "", value);
      }
      if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
      return "";
    }
    module2.exports.dump = dump;
  }
});

// node_modules/js-yaml/index.js
var require_js_yaml = __commonJS({
  "node_modules/js-yaml/index.js"(exports2, module2) {
    "use strict";
    var loader = require_loader();
    var dumper = require_dumper();
    function renamed(from, to) {
      return function() {
        throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
      };
    }
    module2.exports.Type = require_type();
    module2.exports.Schema = require_schema();
    module2.exports.FAILSAFE_SCHEMA = require_failsafe();
    module2.exports.JSON_SCHEMA = require_json2();
    module2.exports.CORE_SCHEMA = require_core();
    module2.exports.DEFAULT_SCHEMA = require_default();
    module2.exports.load = loader.load;
    module2.exports.loadAll = loader.loadAll;
    module2.exports.dump = dumper.dump;
    module2.exports.YAMLException = require_exception();
    module2.exports.types = {
      binary: require_binary(),
      float: require_float(),
      map: require_map(),
      null: require_null(),
      pairs: require_pairs(),
      set: require_set(),
      timestamp: require_timestamp(),
      bool: require_bool(),
      int: require_int(),
      merge: require_merge(),
      omap: require_omap(),
      seq: require_seq(),
      str: require_str()
    };
    module2.exports.safeLoad = renamed("safeLoad", "load");
    module2.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
    module2.exports.safeDump = renamed("safeDump", "dump");
  }
});

// node_modules/lazy-val/out/main.js
var require_main = __commonJS({
  "node_modules/lazy-val/out/main.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Lazy = void 0;
    var Lazy = class {
      constructor(creator) {
        this._value = null;
        this.creator = creator;
      }
      get hasValue() {
        return this.creator == null;
      }
      get value() {
        if (this.creator == null) {
          return this._value;
        }
        const result = this.creator();
        this.value = result;
        return result;
      }
      set value(value) {
        this._value = value;
        this.creator = null;
      }
    };
    exports2.Lazy = Lazy;
  }
});

// node_modules/electron-updater/node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/electron-updater/node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/electron-updater/node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/electron-updater/node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/electron-updater/node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/electron-updater/node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/electron-updater/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/electron-updater/node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/electron-updater/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/electron-updater/node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/electron-updater/node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/electron-updater/node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/clean.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/inc.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/diff.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/major.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/minor.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/patch.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/compare.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/rcompare.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/compare-loose.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/compare-build.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/sort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/rsort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/gt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/lt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/eq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/neq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/gte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/lte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/cmp.js"(exports2, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/electron-updater/node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/coerce.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/electron-updater/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/electron-updater/node_modules/semver/internal/lrucache.js"(exports2, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/electron-updater/node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/electron-updater/node_modules/semver/classes/range.js"(exports2, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/electron-updater/node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/electron-updater/node_modules/semver/classes/comparator.js"(exports2, module2) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/electron-updater/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/electron-updater/node_modules/semver/functions/satisfies.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/to-comparators.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/max-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/min-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/min-version.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/valid.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/outside.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/gtr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/ltr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/intersects.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/simplify.js"(exports2, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/electron-updater/node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/electron-updater/node_modules/semver/ranges/subset.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/electron-updater/node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/electron-updater/node_modules/semver/index.js"(exports2, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/lodash.isequal/index.js
var require_lodash = __commonJS({
  "node_modules/lodash.isequal/index.js"(exports2, module2) {
    var LARGE_ARRAY_SIZE = 200;
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var COMPARE_PARTIAL_FLAG = 1;
    var COMPARE_UNORDERED_FLAG = 2;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var asyncTag = "[object AsyncFunction]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var nullTag = "[object Null]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var proxyTag = "[object Proxy]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var undefinedTag = "[object Undefined]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayFilter(array, predicate) {
      var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }
    function arrayPush(array, values) {
      var index = -1, length = values.length, offset = array.length;
      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array == null ? 0 : array.length;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function cacheHas(cache, key) {
      return cache.has(key);
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var nativeObjectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Buffer2 = moduleExports ? root.Buffer : void 0;
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    var nativeGetSymbols = Object.getOwnPropertySymbols;
    var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map2 = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set2 = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map2);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set2);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map2 || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      var result = getMapData(this, key)["delete"](key);
      this.size -= result ? 1 : 0;
      return result;
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      var data = getMapData(this, key), size = data.size;
      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values == null ? 0 : values.length;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      var data = this.__data__ = new ListCache(entries);
      this.size = data.size;
    }
    function stackClear() {
      this.__data__ = new ListCache();
      this.size = 0;
    }
    function stackDelete(key) {
      var data = this.__data__, result = data["delete"](key);
      this.size = data.size;
      return result;
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof ListCache) {
        var pairs = data.__data__;
        if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new MapCache(pairs);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
        (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
        isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
        isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
        isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    function baseGetAllKeys(object, keysFunc, symbolsFunc) {
      var result = keysFunc(object);
      return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
    }
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag;
    }
    function baseIsEqual(value, other, bitmask, customizer, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
    }
    function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
      objTag = objTag == argsTag ? objectTag : objTag;
      othTag = othTag == argsTag ? objectTag : othTag;
      var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
      if (isSameTag && isBuffer(object)) {
        if (!isBuffer(other)) {
          return false;
        }
        objIsArr = true;
        objIsObj = false;
      }
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
      }
      if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= COMPARE_UNORDERED_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getAllKeys(object) {
      return baseGetAllKeys(object, keys, getSymbols);
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
      if (object == null) {
        return [];
      }
      object = Object(object);
      return arrayFilter(nativeGetSymbols(object), function(symbol) {
        return propertyIsEnumerable.call(object, symbol);
      });
    };
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = baseGetTag(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
      return arguments;
    })()) ? baseIsArguments : function(value) {
      return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
    };
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    var isBuffer = nativeIsBuffer || stubFalse;
    function isEqual(value, other) {
      return baseIsEqual(value, other);
    }
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function stubArray() {
      return [];
    }
    function stubFalse() {
      return false;
    }
    module2.exports = isEqual;
  }
});

// node_modules/electron-updater/out/DownloadedUpdateHelper.js
var require_DownloadedUpdateHelper = __commonJS({
  "node_modules/electron-updater/out/DownloadedUpdateHelper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DownloadedUpdateHelper = void 0;
    exports2.createTempUpdateFile = createTempUpdateFile;
    var crypto_1 = require("crypto");
    var fs_1 = require("fs");
    var isEqual = require_lodash();
    var fs_extra_1 = require_lib();
    var path16 = require("path");
    var DownloadedUpdateHelper = class {
      constructor(cacheDir) {
        this.cacheDir = cacheDir;
        this._file = null;
        this._packageFile = null;
        this.versionInfo = null;
        this.fileInfo = null;
        this._downloadedFileInfo = null;
      }
      get downloadedFileInfo() {
        return this._downloadedFileInfo;
      }
      get file() {
        return this._file;
      }
      get packageFile() {
        return this._packageFile;
      }
      get cacheDirForPendingUpdate() {
        return path16.join(this.cacheDir, "pending");
      }
      async validateDownloadedPath(updateFile, updateInfo, fileInfo, logger) {
        if (this.versionInfo != null && this.file === updateFile && this.fileInfo != null) {
          if (isEqual(this.versionInfo, updateInfo) && isEqual(this.fileInfo.info, fileInfo.info) && await (0, fs_extra_1.pathExists)(updateFile)) {
            return updateFile;
          } else {
            return null;
          }
        }
        const cachedUpdateFile = await this.getValidCachedUpdateFile(fileInfo, logger);
        if (cachedUpdateFile === null) {
          return null;
        }
        logger.info(`Update has already been downloaded to ${updateFile}).`);
        this._file = cachedUpdateFile;
        return cachedUpdateFile;
      }
      async setDownloadedFile(downloadedFile, packageFile, versionInfo, fileInfo, updateFileName, isSaveCache) {
        this._file = downloadedFile;
        this._packageFile = packageFile;
        this.versionInfo = versionInfo;
        this.fileInfo = fileInfo;
        this._downloadedFileInfo = {
          fileName: updateFileName,
          sha512: fileInfo.info.sha512,
          isAdminRightsRequired: fileInfo.info.isAdminRightsRequired === true
        };
        if (isSaveCache) {
          await (0, fs_extra_1.outputJson)(this.getUpdateInfoFile(), this._downloadedFileInfo);
        }
      }
      async clear() {
        this._file = null;
        this._packageFile = null;
        this.versionInfo = null;
        this.fileInfo = null;
        await this.cleanCacheDirForPendingUpdate();
      }
      async cleanCacheDirForPendingUpdate() {
        try {
          await (0, fs_extra_1.emptyDir)(this.cacheDirForPendingUpdate);
        } catch (_ignore) {
        }
      }
      /**
       * Returns "update-info.json" which is created in the update cache directory's "pending" subfolder after the first update is downloaded.  If the update file does not exist then the cache is cleared and recreated.  If the update file exists then its properties are validated.
       * @param fileInfo
       * @param logger
       */
      async getValidCachedUpdateFile(fileInfo, logger) {
        const updateInfoFilePath = this.getUpdateInfoFile();
        const doesUpdateInfoFileExist = await (0, fs_extra_1.pathExists)(updateInfoFilePath);
        if (!doesUpdateInfoFileExist) {
          return null;
        }
        let cachedInfo;
        try {
          cachedInfo = await (0, fs_extra_1.readJson)(updateInfoFilePath);
        } catch (error) {
          let message = `No cached update info available`;
          if (error.code !== "ENOENT") {
            await this.cleanCacheDirForPendingUpdate();
            message += ` (error on read: ${error.message})`;
          }
          logger.info(message);
          return null;
        }
        const isCachedInfoFileNameValid = (cachedInfo === null || cachedInfo === void 0 ? void 0 : cachedInfo.fileName) !== null;
        if (!isCachedInfoFileNameValid) {
          logger.warn(`Cached update info is corrupted: no fileName, directory for cached update will be cleaned`);
          await this.cleanCacheDirForPendingUpdate();
          return null;
        }
        if (fileInfo.info.sha512 !== cachedInfo.sha512) {
          logger.info(`Cached update sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${cachedInfo.sha512}, expected: ${fileInfo.info.sha512}. Directory for cached update will be cleaned`);
          await this.cleanCacheDirForPendingUpdate();
          return null;
        }
        const updateFile = path16.join(this.cacheDirForPendingUpdate, cachedInfo.fileName);
        if (!await (0, fs_extra_1.pathExists)(updateFile)) {
          logger.info("Cached update file doesn't exist");
          return null;
        }
        const sha512 = await hashFile(updateFile);
        if (fileInfo.info.sha512 !== sha512) {
          logger.warn(`Sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${sha512}, expected: ${fileInfo.info.sha512}`);
          await this.cleanCacheDirForPendingUpdate();
          return null;
        }
        this._downloadedFileInfo = cachedInfo;
        return updateFile;
      }
      getUpdateInfoFile() {
        return path16.join(this.cacheDirForPendingUpdate, "update-info.json");
      }
    };
    exports2.DownloadedUpdateHelper = DownloadedUpdateHelper;
    function hashFile(file, algorithm = "sha512", encoding = "base64", options) {
      return new Promise((resolve5, reject) => {
        const hash = (0, crypto_1.createHash)(algorithm);
        hash.on("error", reject).setEncoding(encoding);
        (0, fs_1.createReadStream)(file, {
          ...options,
          highWaterMark: 1024 * 1024
          /* better to use more memory but hash faster */
        }).on("error", reject).on("end", () => {
          hash.end();
          resolve5(hash.read());
        }).pipe(hash, { end: false });
      });
    }
    async function createTempUpdateFile(name, cacheDir, log) {
      let nameCounter = 0;
      let result = path16.join(cacheDir, name);
      for (let i = 0; i < 3; i++) {
        try {
          await (0, fs_extra_1.unlink)(result);
          return result;
        } catch (e) {
          if (e.code === "ENOENT") {
            return result;
          }
          log.warn(`Error on remove temp update file: ${e}`);
          result = path16.join(cacheDir, `${nameCounter++}-${name}`);
        }
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/AppAdapter.js
var require_AppAdapter = __commonJS({
  "node_modules/electron-updater/out/AppAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getAppCacheDir = getAppCacheDir;
    var path16 = require("path");
    var os_1 = require("os");
    function getAppCacheDir() {
      const homedir4 = (0, os_1.homedir)();
      let result;
      if (process.platform === "win32") {
        result = process.env["LOCALAPPDATA"] || path16.join(homedir4, "AppData", "Local");
      } else if (process.platform === "darwin") {
        result = path16.join(homedir4, "Library", "Caches");
      } else {
        result = process.env["XDG_CACHE_HOME"] || path16.join(homedir4, ".cache");
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/ElectronAppAdapter.js
var require_ElectronAppAdapter = __commonJS({
  "node_modules/electron-updater/out/ElectronAppAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ElectronAppAdapter = void 0;
    var path16 = require("path");
    var AppAdapter_1 = require_AppAdapter();
    var ElectronAppAdapter = class {
      constructor(app6 = require("electron").app) {
        this.app = app6;
      }
      whenReady() {
        return this.app.whenReady();
      }
      get version() {
        return this.app.getVersion();
      }
      get name() {
        return this.app.getName();
      }
      get isPackaged() {
        return this.app.isPackaged === true;
      }
      get appUpdateConfigPath() {
        return this.isPackaged ? path16.join(process.resourcesPath, "app-update.yml") : path16.join(this.app.getAppPath(), "dev-app-update.yml");
      }
      get userDataPath() {
        return this.app.getPath("userData");
      }
      get baseCachePath() {
        return (0, AppAdapter_1.getAppCacheDir)();
      }
      quit() {
        this.app.quit();
      }
      relaunch() {
        this.app.relaunch();
      }
      onQuit(handler) {
        this.app.once("quit", (_, exitCode) => handler(exitCode));
      }
    };
    exports2.ElectronAppAdapter = ElectronAppAdapter;
  }
});

// node_modules/electron-updater/out/electronHttpExecutor.js
var require_electronHttpExecutor = __commonJS({
  "node_modules/electron-updater/out/electronHttpExecutor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ElectronHttpExecutor = exports2.NET_SESSION_NAME = void 0;
    exports2.getNetSession = getNetSession;
    var builder_util_runtime_1 = require_out();
    exports2.NET_SESSION_NAME = "electron-updater";
    function getNetSession() {
      return require("electron").session.fromPartition(exports2.NET_SESSION_NAME, {
        cache: false
      });
    }
    var ElectronHttpExecutor = class extends builder_util_runtime_1.HttpExecutor {
      constructor(proxyLoginCallback) {
        super();
        this.proxyLoginCallback = proxyLoginCallback;
        this.cachedSession = null;
      }
      async download(url, destination, options) {
        return await options.cancellationToken.createPromise((resolve5, reject, onCancel) => {
          const requestOptions = {
            headers: options.headers || void 0,
            redirect: "manual"
          };
          (0, builder_util_runtime_1.configureRequestUrl)(url, requestOptions);
          (0, builder_util_runtime_1.configureRequestOptions)(requestOptions);
          this.doDownload(requestOptions, {
            destination,
            options,
            onCancel,
            callback: (error) => {
              if (error == null) {
                resolve5(destination);
              } else {
                reject(error);
              }
            },
            responseHandler: null
          }, 0);
        });
      }
      createRequest(options, callback) {
        if (options.headers && options.headers.Host) {
          options.host = options.headers.Host;
          delete options.headers.Host;
        }
        if (this.cachedSession == null) {
          this.cachedSession = getNetSession();
        }
        const request = require("electron").net.request({
          ...options,
          session: this.cachedSession
        });
        request.on("response", callback);
        if (this.proxyLoginCallback != null) {
          request.on("login", this.proxyLoginCallback);
        }
        return request;
      }
      addRedirectHandlers(request, options, reject, redirectCount, handler) {
        request.on("redirect", (statusCode, method, redirectUrl) => {
          request.abort();
          if (redirectCount > this.maxRedirects) {
            reject(this.createMaxRedirectError());
          } else {
            handler(builder_util_runtime_1.HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options));
          }
        });
      }
    };
    exports2.ElectronHttpExecutor = ElectronHttpExecutor;
  }
});

// node_modules/electron-updater/out/util.js
var require_util = __commonJS({
  "node_modules/electron-updater/out/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.newBaseUrl = newBaseUrl;
    exports2.newUrlFromBase = newUrlFromBase;
    exports2.getChannelFilename = getChannelFilename;
    var url_1 = require("url");
    function newBaseUrl(url) {
      const result = new url_1.URL(url);
      if (!result.pathname.endsWith("/")) {
        result.pathname += "/";
      }
      return result;
    }
    function newUrlFromBase(pathname, baseUrl, addRandomQueryToAvoidCaching = false) {
      const result = new url_1.URL(pathname, baseUrl);
      const search = baseUrl.search;
      if (search != null && search.length !== 0) {
        result.search = search;
      } else if (addRandomQueryToAvoidCaching) {
        result.search = `noCache=${Date.now().toString(32)}`;
      }
      return result;
    }
    function getChannelFilename(channel) {
      return `${channel}.yml`;
    }
  }
});

// node_modules/lodash.escaperegexp/index.js
var require_lodash2 = __commonJS({
  "node_modules/lodash.escaperegexp/index.js"(exports2, module2) {
    var INFINITY = 1 / 0;
    var symbolTag = "[object Symbol]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reHasRegExpChar = RegExp(reRegExpChar.source);
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    var Symbol2 = root.Symbol;
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function escapeRegExp(string) {
      string = toString(string);
      return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
    }
    module2.exports = escapeRegExp;
  }
});

// node_modules/electron-updater/out/providers/Provider.js
var require_Provider = __commonJS({
  "node_modules/electron-updater/out/providers/Provider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Provider = void 0;
    exports2.findFile = findFile;
    exports2.parseUpdateInfo = parseUpdateInfo;
    exports2.getFileList = getFileList;
    exports2.resolveFiles = resolveFiles;
    var builder_util_runtime_1 = require_out();
    var js_yaml_1 = require_js_yaml();
    var url_1 = require("url");
    var util_1 = require_util();
    var escapeRegExp = require_lodash2();
    var Provider = class {
      constructor(runtimeOptions) {
        this.runtimeOptions = runtimeOptions;
        this.requestHeaders = null;
        this.executor = runtimeOptions.executor;
      }
      // By default, the blockmap file is in the same directory as the main file
      // But some providers may have a different blockmap file, so we need to override this method
      getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
        const newBlockMapUrl = (0, util_1.newUrlFromBase)(`${baseUrl.pathname}.blockmap`, baseUrl);
        const oldBlockMapUrl = (0, util_1.newUrlFromBase)(`${baseUrl.pathname.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion)}.blockmap`, oldBlockMapFileBaseUrl ? new url_1.URL(oldBlockMapFileBaseUrl) : baseUrl);
        return [oldBlockMapUrl, newBlockMapUrl];
      }
      get isUseMultipleRangeRequest() {
        return this.runtimeOptions.isUseMultipleRangeRequest !== false;
      }
      getChannelFilePrefix() {
        if (this.runtimeOptions.platform === "linux") {
          const arch2 = process.env["TEST_UPDATER_ARCH"] || process.arch;
          const archSuffix = arch2 === "x64" ? "" : `-${arch2}`;
          return "-linux" + archSuffix;
        } else {
          return this.runtimeOptions.platform === "darwin" ? "-mac" : "";
        }
      }
      // due to historical reasons for windows we use channel name without platform specifier
      getDefaultChannelName() {
        return this.getCustomChannelName("latest");
      }
      getCustomChannelName(channel) {
        return `${channel}${this.getChannelFilePrefix()}`;
      }
      get fileExtraDownloadHeaders() {
        return null;
      }
      setRequestHeaders(value) {
        this.requestHeaders = value;
      }
      /**
       * Method to perform API request only to resolve update info, but not to download update.
       */
      httpRequest(url, headers, cancellationToken) {
        return this.executor.request(this.createRequestOptions(url, headers), cancellationToken);
      }
      createRequestOptions(url, headers) {
        const result = {};
        if (this.requestHeaders == null) {
          if (headers != null) {
            result.headers = headers;
          }
        } else {
          result.headers = headers == null ? this.requestHeaders : { ...this.requestHeaders, ...headers };
        }
        (0, builder_util_runtime_1.configureRequestUrl)(url, result);
        return result;
      }
    };
    exports2.Provider = Provider;
    function findFile(files, extension, not) {
      var _a;
      if (files.length === 0) {
        throw (0, builder_util_runtime_1.newError)("No files provided", "ERR_UPDATER_NO_FILES_PROVIDED");
      }
      const filteredFiles = files.filter((it) => it.url.pathname.toLowerCase().endsWith(`.${extension.toLowerCase()}`));
      const result = (_a = filteredFiles.find((it) => [it.url.pathname, it.info.url].some((n) => n.includes(process.arch)))) !== null && _a !== void 0 ? _a : filteredFiles.shift();
      if (result) {
        return result;
      } else if (not == null) {
        return files[0];
      } else {
        return files.find((fileInfo) => !not.some((ext) => fileInfo.url.pathname.toLowerCase().endsWith(`.${ext.toLowerCase()}`)));
      }
    }
    function parseUpdateInfo(rawData, channelFile, channelFileUrl) {
      if (rawData == null) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): rawData: null`, "ERR_UPDATER_INVALID_UPDATE_INFO");
      }
      let result;
      try {
        result = (0, js_yaml_1.load)(rawData);
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}, rawData: ${rawData}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
      }
      return result;
    }
    function getFileList(updateInfo) {
      const files = updateInfo.files;
      if (files != null && files.length > 0) {
        return files;
      }
      if (updateInfo.path != null) {
        return [
          {
            url: updateInfo.path,
            sha2: updateInfo.sha2,
            sha512: updateInfo.sha512
          }
        ];
      } else {
        throw (0, builder_util_runtime_1.newError)(`No files provided: ${(0, builder_util_runtime_1.safeStringifyJson)(updateInfo)}`, "ERR_UPDATER_NO_FILES_PROVIDED");
      }
    }
    function resolveFiles(updateInfo, baseUrl, pathTransformer = (p) => p) {
      const files = getFileList(updateInfo);
      const result = files.map((fileInfo) => {
        if (fileInfo.sha2 == null && fileInfo.sha512 == null) {
          throw (0, builder_util_runtime_1.newError)(`Update info doesn't contain nor sha256 neither sha512 checksum: ${(0, builder_util_runtime_1.safeStringifyJson)(fileInfo)}`, "ERR_UPDATER_NO_CHECKSUM");
        }
        return {
          url: (0, util_1.newUrlFromBase)(pathTransformer(fileInfo.url), baseUrl),
          info: fileInfo
        };
      });
      const packages = updateInfo.packages;
      const packageInfo = packages == null ? null : packages[process.arch] || packages.ia32;
      if (packageInfo != null) {
        ;
        result[0].packageInfo = {
          ...packageInfo,
          path: (0, util_1.newUrlFromBase)(pathTransformer(packageInfo.path), baseUrl).href
        };
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/providers/GenericProvider.js
var require_GenericProvider = __commonJS({
  "node_modules/electron-updater/out/providers/GenericProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var GenericProvider = class extends Provider_1.Provider {
      constructor(configuration, updater, runtimeOptions) {
        super(runtimeOptions);
        this.configuration = configuration;
        this.updater = updater;
        this.baseUrl = (0, util_1.newBaseUrl)(this.configuration.url);
      }
      get channel() {
        const result = this.updater.channel || this.configuration.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
      }
      async getLatestVersion() {
        const channelFile = (0, util_1.getChannelFilename)(this.channel);
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        for (let attemptNumber = 0; ; attemptNumber++) {
          try {
            return (0, Provider_1.parseUpdateInfo)(await this.httpRequest(channelUrl), channelFile, channelUrl);
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              throw (0, builder_util_runtime_1.newError)(`Cannot find channel "${channelFile}" update info: ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            } else if (e.code === "ECONNREFUSED") {
              if (attemptNumber < 3) {
                await new Promise((resolve5, reject) => {
                  try {
                    setTimeout(resolve5, 1e3 * attemptNumber);
                  } catch (e2) {
                    reject(e2);
                  }
                });
                continue;
              }
            }
            throw e;
          }
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
      }
    };
    exports2.GenericProvider = GenericProvider;
  }
});

// node_modules/electron-updater/out/providers/BitbucketProvider.js
var require_BitbucketProvider = __commonJS({
  "node_modules/electron-updater/out/providers/BitbucketProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BitbucketProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var BitbucketProvider = class extends Provider_1.Provider {
      constructor(configuration, updater, runtimeOptions) {
        super({
          ...runtimeOptions,
          isUseMultipleRangeRequest: false
        });
        this.configuration = configuration;
        this.updater = updater;
        const { owner, slug } = configuration;
        this.baseUrl = (0, util_1.newBaseUrl)(`https://api.bitbucket.org/2.0/repositories/${owner}/${slug}/downloads`);
      }
      get channel() {
        return this.updater.channel || this.configuration.channel || "latest";
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        try {
          const updateInfo = await this.httpRequest(channelUrl, void 0, cancellationToken);
          return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
      }
      toString() {
        const { owner, slug } = this.configuration;
        return `Bitbucket (owner: ${owner}, slug: ${slug}, channel: ${this.channel})`;
      }
    };
    exports2.BitbucketProvider = BitbucketProvider;
  }
});

// node_modules/electron-updater/out/providers/GitHubProvider.js
var require_GitHubProvider = __commonJS({
  "node_modules/electron-updater/out/providers/GitHubProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GitHubProvider = exports2.BaseGitHubProvider = void 0;
    exports2.computeReleaseNotes = computeReleaseNotes;
    var builder_util_runtime_1 = require_out();
    var semver = require_semver2();
    var url_1 = require("url");
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var hrefRegExp = /\/tag\/([^/]+)$/;
    var BaseGitHubProvider = class extends Provider_1.Provider {
      constructor(options, defaultHost, runtimeOptions) {
        super({
          ...runtimeOptions,
          /* because GitHib uses S3 */
          isUseMultipleRangeRequest: false
        });
        this.options = options;
        this.baseUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, defaultHost));
        const apiHost = defaultHost === "github.com" ? "api.github.com" : defaultHost;
        this.baseApiUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, apiHost));
      }
      computeGithubBasePath(result) {
        const host = this.options.host;
        return host && !["github.com", "api.github.com"].includes(host) ? `/api/v3${result}` : result;
      }
    };
    exports2.BaseGitHubProvider = BaseGitHubProvider;
    var GitHubProvider = class extends BaseGitHubProvider {
      constructor(options, updater, runtimeOptions) {
        super(options, "github.com", runtimeOptions);
        this.options = options;
        this.updater = updater;
      }
      get channel() {
        const result = this.updater.channel || this.options.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
      }
      async getLatestVersion() {
        var _a, _b, _c, _d, _e;
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const feedXml = await this.httpRequest((0, util_1.newUrlFromBase)(`${this.basePath}.atom`, this.baseUrl), {
          accept: "application/xml, application/atom+xml, text/xml, */*"
        }, cancellationToken);
        const feed = (0, builder_util_runtime_1.parseXml)(feedXml);
        let latestRelease = feed.element("entry", false, `No published versions on GitHub`);
        let tag = null;
        try {
          if (this.updater.allowPrerelease) {
            const currentChannel = ((_a = this.updater) === null || _a === void 0 ? void 0 : _a.channel) || ((_b = semver.prerelease(this.updater.currentVersion)) === null || _b === void 0 ? void 0 : _b[0]) || null;
            if (currentChannel === null) {
              tag = hrefRegExp.exec(latestRelease.element("link").attribute("href"))[1];
            } else {
              for (const element of feed.getElements("entry")) {
                const hrefElement = hrefRegExp.exec(element.element("link").attribute("href"));
                if (hrefElement === null) {
                  continue;
                }
                const hrefTag = hrefElement[1];
                const hrefChannel = ((_c = semver.prerelease(hrefTag)) === null || _c === void 0 ? void 0 : _c[0]) || null;
                const shouldFetchVersion = !currentChannel || ["alpha", "beta"].includes(currentChannel);
                const isCustomChannel = hrefChannel !== null && !["alpha", "beta"].includes(String(hrefChannel));
                const channelMismatch = currentChannel === "beta" && hrefChannel === "alpha";
                if (shouldFetchVersion && !isCustomChannel && !channelMismatch) {
                  tag = hrefTag;
                  break;
                }
                const isNextPreRelease = hrefChannel && hrefChannel === currentChannel;
                if (isNextPreRelease) {
                  tag = hrefTag;
                  break;
                }
              }
            }
          } else {
            tag = await this.getLatestTagName(cancellationToken);
            for (const element of feed.getElements("entry")) {
              if (hrefRegExp.exec(element.element("link").attribute("href"))[1] === tag) {
                latestRelease = element;
                break;
              }
            }
          }
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Cannot parse releases feed: ${e.stack || e.message},
XML:
${feedXml}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
        }
        if (tag == null) {
          throw (0, builder_util_runtime_1.newError)(`No published versions on GitHub`, "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
        }
        let rawData;
        let channelFile = "";
        let channelFileUrl = "";
        const fetchData = async (channelName) => {
          channelFile = (0, util_1.getChannelFilename)(channelName);
          channelFileUrl = (0, util_1.newUrlFromBase)(this.getBaseDownloadPath(String(tag), channelFile), this.baseUrl);
          const requestOptions = this.createRequestOptions(channelFileUrl);
          try {
            return await this.executor.request(requestOptions, cancellationToken);
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            throw e;
          }
        };
        try {
          let channel = this.channel;
          if (this.updater.allowPrerelease && ((_d = semver.prerelease(tag)) === null || _d === void 0 ? void 0 : _d[0])) {
            channel = this.getCustomChannelName(String((_e = semver.prerelease(tag)) === null || _e === void 0 ? void 0 : _e[0]));
          }
          rawData = await fetchData(channel);
        } catch (e) {
          if (this.updater.allowPrerelease) {
            rawData = await fetchData(this.getDefaultChannelName());
          } else {
            throw e;
          }
        }
        const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
        if (result.releaseName == null) {
          result.releaseName = latestRelease.elementValueOrEmpty("title");
        }
        if (result.releaseNotes == null) {
          result.releaseNotes = computeReleaseNotes(this.updater.currentVersion, this.updater.fullChangelog, feed, latestRelease);
        }
        return {
          tag,
          ...result
        };
      }
      async getLatestTagName(cancellationToken) {
        const options = this.options;
        const url = options.host == null || options.host === "github.com" ? (0, util_1.newUrlFromBase)(`${this.basePath}/latest`, this.baseUrl) : new url_1.URL(`${this.computeGithubBasePath(`/repos/${options.owner}/${options.repo}/releases`)}/latest`, this.baseApiUrl);
        try {
          const rawData = await this.httpRequest(url, { Accept: "application/json" }, cancellationToken);
          if (rawData == null) {
            return null;
          }
          const releaseInfo = JSON.parse(rawData);
          return releaseInfo.tag_name;
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      get basePath() {
        return `/${this.options.owner}/${this.options.repo}/releases`;
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl, (p) => this.getBaseDownloadPath(updateInfo.tag, p.replace(/ /g, "-")));
      }
      getBaseDownloadPath(tag, fileName) {
        return `${this.basePath}/download/${tag}/${fileName}`;
      }
    };
    exports2.GitHubProvider = GitHubProvider;
    function getNoteValue(parent) {
      const result = parent.elementValueOrEmpty("content");
      return result === "No content." ? "" : result;
    }
    function computeReleaseNotes(currentVersion, isFullChangelog, feed, latestRelease) {
      if (!isFullChangelog) {
        return getNoteValue(latestRelease);
      }
      const releaseNotes = [];
      for (const release of feed.getElements("entry")) {
        const versionRelease = /\/tag\/v?([^/]+)$/.exec(release.element("link").attribute("href"))[1];
        if (semver.valid(versionRelease) && semver.lt(currentVersion, versionRelease)) {
          releaseNotes.push({
            version: versionRelease,
            note: getNoteValue(release)
          });
        }
      }
      return releaseNotes.sort((a, b) => semver.rcompare(a.version, b.version));
    }
  }
});

// node_modules/electron-updater/out/providers/GitLabProvider.js
var require_GitLabProvider = __commonJS({
  "node_modules/electron-updater/out/providers/GitLabProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GitLabProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var url_1 = require("url");
    var escapeRegExp = require_lodash2();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var GitLabProvider = class extends Provider_1.Provider {
      /**
       * Normalizes filenames by replacing spaces and underscores with dashes.
       *
       * This is a workaround to handle filename formatting differences between tools:
       * - electron-builder formats filenames like "test file.txt" as "test-file.txt"
       * - GitLab may provide asset URLs using underscores, such as "test_file.txt"
       *
       * Because of this mismatch, we can't reliably extract the correct filename from
       * the asset path without normalization. This function ensures consistent matching
       * across different filename formats by converting all spaces and underscores to dashes.
       *
       * @param filename The filename to normalize
       * @returns The normalized filename with spaces and underscores replaced by dashes
       */
      normalizeFilename(filename) {
        return filename.replace(/ |_/g, "-");
      }
      constructor(options, updater, runtimeOptions) {
        super({
          ...runtimeOptions,
          // GitLab might not support multiple range requests efficiently
          isUseMultipleRangeRequest: false
        });
        this.options = options;
        this.updater = updater;
        this.cachedLatestVersion = null;
        const defaultHost = "gitlab.com";
        const host = options.host || defaultHost;
        this.baseApiUrl = (0, util_1.newBaseUrl)(`https://${host}/api/v4`);
      }
      get channel() {
        const result = this.updater.channel || this.options.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const latestReleaseUrl = (0, util_1.newUrlFromBase)(`projects/${this.options.projectId}/releases/permalink/latest`, this.baseApiUrl);
        let latestRelease;
        try {
          const header = { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.options.token || null) };
          const releaseResponse = await this.httpRequest(latestReleaseUrl, header, cancellationToken);
          if (!releaseResponse) {
            throw (0, builder_util_runtime_1.newError)("No latest release found", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
          }
          latestRelease = JSON.parse(releaseResponse);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest release on GitLab (${latestReleaseUrl}): ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        const tag = latestRelease.tag_name;
        let rawData = null;
        let channelFile = "";
        let channelFileUrl = null;
        const fetchChannelData = async (channelName) => {
          channelFile = (0, util_1.getChannelFilename)(channelName);
          const channelAsset = latestRelease.assets.links.find((asset) => asset.name === channelFile);
          if (!channelAsset) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release assets`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          }
          channelFileUrl = new url_1.URL(channelAsset.direct_asset_url);
          const headers = this.options.token ? { "PRIVATE-TOKEN": this.options.token } : void 0;
          try {
            const result2 = await this.httpRequest(channelFileUrl, headers, cancellationToken);
            if (!result2) {
              throw (0, builder_util_runtime_1.newError)(`Empty response from ${channelFileUrl}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            return result2;
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            throw e;
          }
        };
        try {
          rawData = await fetchChannelData(this.channel);
        } catch (e) {
          if (this.channel !== this.getDefaultChannelName()) {
            rawData = await fetchChannelData(this.getDefaultChannelName());
          } else {
            throw e;
          }
        }
        if (!rawData) {
          throw (0, builder_util_runtime_1.newError)(`Unable to parse channel data from ${channelFile}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
        }
        const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
        if (result.releaseName == null) {
          result.releaseName = latestRelease.name;
        }
        if (result.releaseNotes == null) {
          result.releaseNotes = latestRelease.description || null;
        }
        const assetsMap = /* @__PURE__ */ new Map();
        for (const asset of latestRelease.assets.links) {
          assetsMap.set(this.normalizeFilename(asset.name), asset.direct_asset_url);
        }
        const gitlabUpdateInfo = {
          tag,
          assets: assetsMap,
          ...result
        };
        this.cachedLatestVersion = gitlabUpdateInfo;
        return gitlabUpdateInfo;
      }
      /**
       * Utility function to convert GitlabReleaseAsset to Map<string, string>
       * Maps asset names to their download URLs
       */
      convertAssetsToMap(assets) {
        const assetsMap = /* @__PURE__ */ new Map();
        for (const asset of assets.links) {
          assetsMap.set(this.normalizeFilename(asset.name), asset.direct_asset_url);
        }
        return assetsMap;
      }
      /**
       * Find blockmap file URL in assets map for a specific filename
       */
      findBlockMapInAssets(assets, filename) {
        const possibleBlockMapNames = [`${filename}.blockmap`, `${this.normalizeFilename(filename)}.blockmap`];
        for (const blockMapName of possibleBlockMapNames) {
          const assetUrl = assets.get(blockMapName);
          if (assetUrl) {
            return new url_1.URL(assetUrl);
          }
        }
        return null;
      }
      async fetchReleaseInfoByVersion(version) {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const possibleReleaseIds = [`v${version}`, version];
        for (const releaseId of possibleReleaseIds) {
          const releaseUrl = (0, util_1.newUrlFromBase)(`projects/${this.options.projectId}/releases/${encodeURIComponent(releaseId)}`, this.baseApiUrl);
          try {
            const header = { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.options.token || null) };
            const releaseResponse = await this.httpRequest(releaseUrl, header, cancellationToken);
            if (releaseResponse) {
              const release = JSON.parse(releaseResponse);
              return release;
            }
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              continue;
            }
            throw (0, builder_util_runtime_1.newError)(`Unable to find release ${releaseId} on GitLab (${releaseUrl}): ${e.stack || e.message}`, "ERR_UPDATER_RELEASE_NOT_FOUND");
          }
        }
        throw (0, builder_util_runtime_1.newError)(`Unable to find release with version ${version} (tried: ${possibleReleaseIds.join(", ")}) on GitLab`, "ERR_UPDATER_RELEASE_NOT_FOUND");
      }
      setAuthHeaderForToken(token) {
        const headers = {};
        if (token != null) {
          if (token.startsWith("Bearer")) {
            headers.authorization = token;
          } else {
            headers["PRIVATE-TOKEN"] = token;
          }
        }
        return headers;
      }
      /**
       * Get version info for blockmap files, using cache when possible
       */
      async getVersionInfoForBlockMap(version) {
        if (this.cachedLatestVersion && this.cachedLatestVersion.version === version) {
          return this.cachedLatestVersion.assets;
        }
        const versionInfo = await this.fetchReleaseInfoByVersion(version);
        if (versionInfo && versionInfo.assets) {
          return this.convertAssetsToMap(versionInfo.assets);
        }
        return null;
      }
      /**
       * Find blockmap URLs from version assets
       */
      async findBlockMapUrlsFromAssets(oldVersion, newVersion, baseFilename) {
        let newBlockMapUrl = null;
        let oldBlockMapUrl = null;
        const newVersionAssets = await this.getVersionInfoForBlockMap(newVersion);
        if (newVersionAssets) {
          newBlockMapUrl = this.findBlockMapInAssets(newVersionAssets, baseFilename);
        }
        const oldVersionAssets = await this.getVersionInfoForBlockMap(oldVersion);
        if (oldVersionAssets) {
          const oldFilename = baseFilename.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion);
          oldBlockMapUrl = this.findBlockMapInAssets(oldVersionAssets, oldFilename);
        }
        return [oldBlockMapUrl, newBlockMapUrl];
      }
      async getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
        if (this.options.uploadTarget === "project_upload") {
          const baseFilename = baseUrl.pathname.split("/").pop() || "";
          const [oldBlockMapUrl, newBlockMapUrl] = await this.findBlockMapUrlsFromAssets(oldVersion, newVersion, baseFilename);
          if (!newBlockMapUrl) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find blockmap file for ${newVersion} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
          }
          if (!oldBlockMapUrl) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find blockmap file for ${oldVersion} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
          }
          return [oldBlockMapUrl, newBlockMapUrl];
        } else {
          return super.getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl);
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.getFileList)(updateInfo).map((fileInfo) => {
          const possibleNames = [
            fileInfo.url,
            // Original filename
            this.normalizeFilename(fileInfo.url)
            // Normalized filename (spaces/underscores → dashes)
          ];
          const matchingAssetName = possibleNames.find((name) => updateInfo.assets.has(name));
          const assetUrl = matchingAssetName ? updateInfo.assets.get(matchingAssetName) : void 0;
          if (!assetUrl) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${fileInfo.url}" in GitLab release assets. Available assets: ${Array.from(updateInfo.assets.keys()).join(", ")}`, "ERR_UPDATER_ASSET_NOT_FOUND");
          }
          return {
            url: new url_1.URL(assetUrl),
            info: fileInfo
          };
        });
      }
      toString() {
        return `GitLab (projectId: ${this.options.projectId}, channel: ${this.channel})`;
      }
    };
    exports2.GitLabProvider = GitLabProvider;
  }
});

// node_modules/electron-updater/out/providers/KeygenProvider.js
var require_KeygenProvider = __commonJS({
  "node_modules/electron-updater/out/providers/KeygenProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.KeygenProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var KeygenProvider = class extends Provider_1.Provider {
      constructor(configuration, updater, runtimeOptions) {
        super({
          ...runtimeOptions,
          isUseMultipleRangeRequest: false
        });
        this.configuration = configuration;
        this.updater = updater;
        this.defaultHostname = "api.keygen.sh";
        const host = this.configuration.host || this.defaultHostname;
        this.baseUrl = (0, util_1.newBaseUrl)(`https://${host}/v1/accounts/${this.configuration.account}/artifacts?product=${this.configuration.product}`);
      }
      get channel() {
        return this.updater.channel || this.configuration.channel || "stable";
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        try {
          const updateInfo = await this.httpRequest(channelUrl, {
            Accept: "application/vnd.api+json",
            "Keygen-Version": "1.1"
          }, cancellationToken);
          return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
      }
      toString() {
        const { account, product, platform: platform2 } = this.configuration;
        return `Keygen (account: ${account}, product: ${product}, platform: ${platform2}, channel: ${this.channel})`;
      }
    };
    exports2.KeygenProvider = KeygenProvider;
  }
});

// node_modules/electron-updater/out/providers/PrivateGitHubProvider.js
var require_PrivateGitHubProvider = __commonJS({
  "node_modules/electron-updater/out/providers/PrivateGitHubProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PrivateGitHubProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var js_yaml_1 = require_js_yaml();
    var path16 = require("path");
    var url_1 = require("url");
    var util_1 = require_util();
    var GitHubProvider_1 = require_GitHubProvider();
    var Provider_1 = require_Provider();
    var PrivateGitHubProvider = class extends GitHubProvider_1.BaseGitHubProvider {
      constructor(options, updater, token, runtimeOptions) {
        super(options, "api.github.com", runtimeOptions);
        this.updater = updater;
        this.token = token;
      }
      createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getDefaultChannelName());
        const releaseInfo = await this.getLatestVersionInfo(cancellationToken);
        const asset = releaseInfo.assets.find((it) => it.name === channelFile);
        if (asset == null) {
          throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the release ${releaseInfo.html_url || releaseInfo.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        }
        const url = new url_1.URL(asset.url);
        let result;
        try {
          result = (0, js_yaml_1.load)(await this.httpRequest(url, this.configureHeaders("application/octet-stream"), cancellationToken));
        } catch (e) {
          if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${url}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          }
          throw e;
        }
        ;
        result.assets = releaseInfo.assets;
        return result;
      }
      get fileExtraDownloadHeaders() {
        return this.configureHeaders("application/octet-stream");
      }
      configureHeaders(accept) {
        return {
          accept,
          authorization: `token ${this.token}`
        };
      }
      async getLatestVersionInfo(cancellationToken) {
        const allowPrerelease = this.updater.allowPrerelease;
        let basePath = this.basePath;
        if (!allowPrerelease) {
          basePath = `${basePath}/latest`;
        }
        const url = (0, util_1.newUrlFromBase)(basePath, this.baseUrl);
        try {
          const version = JSON.parse(await this.httpRequest(url, this.configureHeaders("application/vnd.github.v3+json"), cancellationToken));
          if (allowPrerelease) {
            return version.find((it) => it.prerelease) || version[0];
          } else {
            return version;
          }
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      get basePath() {
        return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.getFileList)(updateInfo).map((it) => {
          const name = path16.posix.basename(it.url).replace(/ /g, "-");
          const asset = updateInfo.assets.find((it2) => it2 != null && it2.name === name);
          if (asset == null) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${name}" in: ${JSON.stringify(updateInfo.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
          }
          return {
            url: new url_1.URL(asset.url),
            info: it
          };
        });
      }
    };
    exports2.PrivateGitHubProvider = PrivateGitHubProvider;
  }
});

// node_modules/electron-updater/out/providerFactory.js
var require_providerFactory = __commonJS({
  "node_modules/electron-updater/out/providerFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isUrlProbablySupportMultiRangeRequests = isUrlProbablySupportMultiRangeRequests;
    exports2.createClient = createClient;
    var builder_util_runtime_1 = require_out();
    var BitbucketProvider_1 = require_BitbucketProvider();
    var GenericProvider_1 = require_GenericProvider();
    var GitHubProvider_1 = require_GitHubProvider();
    var GitLabProvider_1 = require_GitLabProvider();
    var KeygenProvider_1 = require_KeygenProvider();
    var PrivateGitHubProvider_1 = require_PrivateGitHubProvider();
    function isUrlProbablySupportMultiRangeRequests(url) {
      return !url.includes("s3.amazonaws.com");
    }
    function createClient(data, updater, runtimeOptions) {
      if (typeof data === "string") {
        throw (0, builder_util_runtime_1.newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
      }
      const provider = data.provider;
      switch (provider) {
        case "github": {
          const githubOptions = data;
          const token = (githubOptions.private ? process.env["GH_TOKEN"] || process.env["GITHUB_TOKEN"] : null) || githubOptions.token;
          if (token == null) {
            return new GitHubProvider_1.GitHubProvider(githubOptions, updater, runtimeOptions);
          } else {
            return new PrivateGitHubProvider_1.PrivateGitHubProvider(githubOptions, updater, token, runtimeOptions);
          }
        }
        case "bitbucket":
          return new BitbucketProvider_1.BitbucketProvider(data, updater, runtimeOptions);
        case "gitlab":
          return new GitLabProvider_1.GitLabProvider(data, updater, runtimeOptions);
        case "keygen":
          return new KeygenProvider_1.KeygenProvider(data, updater, runtimeOptions);
        case "s3":
        case "spaces":
          return new GenericProvider_1.GenericProvider({
            provider: "generic",
            url: (0, builder_util_runtime_1.getS3LikeProviderBaseUrl)(data),
            channel: data.channel || null
          }, updater, {
            ...runtimeOptions,
            // https://github.com/minio/minio/issues/5285#issuecomment-350428955
            isUseMultipleRangeRequest: false
          });
        case "generic": {
          const options = data;
          return new GenericProvider_1.GenericProvider(options, updater, {
            ...runtimeOptions,
            isUseMultipleRangeRequest: options.useMultipleRangeRequest !== false && isUrlProbablySupportMultiRangeRequests(options.url)
          });
        }
        case "custom": {
          const options = data;
          const constructor = options.updateProvider;
          if (!constructor) {
            throw (0, builder_util_runtime_1.newError)("Custom provider not specified", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
          }
          return new constructor(options, updater, runtimeOptions);
        }
        default:
          throw (0, builder_util_runtime_1.newError)(`Unsupported provider: ${provider}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
      }
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/downloadPlanBuilder.js
var require_downloadPlanBuilder = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/downloadPlanBuilder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OperationKind = void 0;
    exports2.computeOperations = computeOperations;
    var OperationKind;
    (function(OperationKind2) {
      OperationKind2[OperationKind2["COPY"] = 0] = "COPY";
      OperationKind2[OperationKind2["DOWNLOAD"] = 1] = "DOWNLOAD";
    })(OperationKind || (exports2.OperationKind = OperationKind = {}));
    function computeOperations(oldBlockMap, newBlockMap, logger) {
      const nameToOldBlocks = buildBlockFileMap(oldBlockMap.files);
      const nameToNewBlocks = buildBlockFileMap(newBlockMap.files);
      let lastOperation = null;
      const blockMapFile = newBlockMap.files[0];
      const operations = [];
      const name = blockMapFile.name;
      const oldEntry = nameToOldBlocks.get(name);
      if (oldEntry == null) {
        throw new Error(`no file ${name} in old blockmap`);
      }
      const newFile = nameToNewBlocks.get(name);
      let changedBlockCount = 0;
      const { checksumToOffset: checksumToOldOffset, checksumToOldSize } = buildChecksumMap(nameToOldBlocks.get(name), oldEntry.offset, logger);
      let newOffset = blockMapFile.offset;
      for (let i = 0; i < newFile.checksums.length; newOffset += newFile.sizes[i], i++) {
        const blockSize = newFile.sizes[i];
        const checksum = newFile.checksums[i];
        let oldOffset = checksumToOldOffset.get(checksum);
        if (oldOffset != null && checksumToOldSize.get(checksum) !== blockSize) {
          logger.warn(`Checksum ("${checksum}") matches, but size differs (old: ${checksumToOldSize.get(checksum)}, new: ${blockSize})`);
          oldOffset = void 0;
        }
        if (oldOffset === void 0) {
          changedBlockCount++;
          if (lastOperation != null && lastOperation.kind === OperationKind.DOWNLOAD && lastOperation.end === newOffset) {
            lastOperation.end += blockSize;
          } else {
            lastOperation = {
              kind: OperationKind.DOWNLOAD,
              start: newOffset,
              end: newOffset + blockSize
              // oldBlocks: null,
            };
            validateAndAdd(lastOperation, operations, checksum, i);
          }
        } else {
          if (lastOperation != null && lastOperation.kind === OperationKind.COPY && lastOperation.end === oldOffset) {
            lastOperation.end += blockSize;
          } else {
            lastOperation = {
              kind: OperationKind.COPY,
              start: oldOffset,
              end: oldOffset + blockSize
              // oldBlocks: [checksum]
            };
            validateAndAdd(lastOperation, operations, checksum, i);
          }
        }
      }
      if (changedBlockCount > 0) {
        logger.info(`File${blockMapFile.name === "file" ? "" : " " + blockMapFile.name} has ${changedBlockCount} changed blocks`);
      }
      return operations;
    }
    var isValidateOperationRange = process.env["DIFFERENTIAL_DOWNLOAD_PLAN_BUILDER_VALIDATE_RANGES"] === "true";
    function validateAndAdd(operation, operations, checksum, index) {
      if (isValidateOperationRange && operations.length !== 0) {
        const lastOperation = operations[operations.length - 1];
        if (lastOperation.kind === operation.kind && operation.start < lastOperation.end && operation.start > lastOperation.start) {
          const min = [lastOperation.start, lastOperation.end, operation.start, operation.end].reduce((p, v) => p < v ? p : v);
          throw new Error(`operation (block index: ${index}, checksum: ${checksum}, kind: ${OperationKind[operation.kind]}) overlaps previous operation (checksum: ${checksum}):
abs: ${lastOperation.start} until ${lastOperation.end} and ${operation.start} until ${operation.end}
rel: ${lastOperation.start - min} until ${lastOperation.end - min} and ${operation.start - min} until ${operation.end - min}`);
        }
      }
      operations.push(operation);
    }
    function buildChecksumMap(file, fileOffset, logger) {
      const checksumToOffset = /* @__PURE__ */ new Map();
      const checksumToSize = /* @__PURE__ */ new Map();
      let offset = fileOffset;
      for (let i = 0; i < file.checksums.length; i++) {
        const checksum = file.checksums[i];
        const size = file.sizes[i];
        const existing = checksumToSize.get(checksum);
        if (existing === void 0) {
          checksumToOffset.set(checksum, offset);
          checksumToSize.set(checksum, size);
        } else if (logger.debug != null) {
          const sizeExplanation = existing === size ? "(same size)" : `(size: ${existing}, this size: ${size})`;
          logger.debug(`${checksum} duplicated in blockmap ${sizeExplanation}, it doesn't lead to broken differential downloader, just corresponding block will be skipped)`);
        }
        offset += size;
      }
      return { checksumToOffset, checksumToOldSize: checksumToSize };
    }
    function buildBlockFileMap(list) {
      const result = /* @__PURE__ */ new Map();
      for (const item of list) {
        result.set(item.name, item);
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/DataSplitter.js
var require_DataSplitter = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/DataSplitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DataSplitter = void 0;
    exports2.copyData = copyData;
    var builder_util_runtime_1 = require_out();
    var fs_1 = require("fs");
    var stream_1 = require("stream");
    var downloadPlanBuilder_1 = require_downloadPlanBuilder();
    var DOUBLE_CRLF = Buffer.from("\r\n\r\n");
    var ReadState;
    (function(ReadState2) {
      ReadState2[ReadState2["INIT"] = 0] = "INIT";
      ReadState2[ReadState2["HEADER"] = 1] = "HEADER";
      ReadState2[ReadState2["BODY"] = 2] = "BODY";
    })(ReadState || (ReadState = {}));
    function copyData(task, out, oldFileFd, reject, resolve5) {
      const readStream = (0, fs_1.createReadStream)("", {
        fd: oldFileFd,
        autoClose: false,
        start: task.start,
        // end is inclusive
        end: task.end - 1
      });
      readStream.on("error", reject);
      readStream.once("end", resolve5);
      readStream.pipe(out, {
        end: false
      });
    }
    var DataSplitter = class extends stream_1.Writable {
      constructor(out, options, partIndexToTaskIndex, boundary, partIndexToLength, finishHandler, grandTotalBytes, onProgress) {
        super();
        this.out = out;
        this.options = options;
        this.partIndexToTaskIndex = partIndexToTaskIndex;
        this.partIndexToLength = partIndexToLength;
        this.finishHandler = finishHandler;
        this.grandTotalBytes = grandTotalBytes;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.nextUpdate = this.start + 1e3;
        this.transferred = 0;
        this.delta = 0;
        this.partIndex = -1;
        this.headerListBuffer = null;
        this.readState = ReadState.INIT;
        this.ignoreByteCount = 0;
        this.remainingPartDataCount = 0;
        this.actualPartLength = 0;
        this.boundaryLength = boundary.length + 4;
        this.ignoreByteCount = this.boundaryLength - 2;
      }
      get isFinished() {
        return this.partIndex === this.partIndexToLength.length;
      }
      // noinspection JSUnusedGlobalSymbols
      _write(data, encoding, callback) {
        if (this.isFinished) {
          console.error(`Trailing ignored data: ${data.length} bytes`);
          return;
        }
        this.handleData(data).then(() => {
          if (this.onProgress) {
            const now = Date.now();
            if ((now >= this.nextUpdate || this.transferred === this.grandTotalBytes) && this.grandTotalBytes && (now - this.start) / 1e3) {
              this.nextUpdate = now + 1e3;
              this.onProgress({
                total: this.grandTotalBytes,
                delta: this.delta,
                transferred: this.transferred,
                percent: this.transferred / this.grandTotalBytes * 100,
                bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
              });
              this.delta = 0;
            }
          }
          callback();
        }).catch(callback);
      }
      async handleData(chunk) {
        let start = 0;
        if (this.ignoreByteCount !== 0 && this.remainingPartDataCount !== 0) {
          throw (0, builder_util_runtime_1.newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
        }
        if (this.ignoreByteCount > 0) {
          const toIgnore = Math.min(this.ignoreByteCount, chunk.length);
          this.ignoreByteCount -= toIgnore;
          start = toIgnore;
        } else if (this.remainingPartDataCount > 0) {
          const toRead = Math.min(this.remainingPartDataCount, chunk.length);
          this.remainingPartDataCount -= toRead;
          await this.processPartData(chunk, 0, toRead);
          start = toRead;
        }
        if (start === chunk.length) {
          return;
        }
        if (this.readState === ReadState.HEADER) {
          const headerListEnd = this.searchHeaderListEnd(chunk, start);
          if (headerListEnd === -1) {
            return;
          }
          start = headerListEnd;
          this.readState = ReadState.BODY;
          this.headerListBuffer = null;
        }
        while (true) {
          if (this.readState === ReadState.BODY) {
            this.readState = ReadState.INIT;
          } else {
            this.partIndex++;
            let taskIndex = this.partIndexToTaskIndex.get(this.partIndex);
            if (taskIndex == null) {
              if (this.isFinished) {
                taskIndex = this.options.end;
              } else {
                throw (0, builder_util_runtime_1.newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
              }
            }
            const prevTaskIndex = this.partIndex === 0 ? this.options.start : this.partIndexToTaskIndex.get(this.partIndex - 1) + 1;
            if (prevTaskIndex < taskIndex) {
              await this.copyExistingData(prevTaskIndex, taskIndex);
            } else if (prevTaskIndex > taskIndex) {
              throw (0, builder_util_runtime_1.newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
            }
            if (this.isFinished) {
              this.onPartEnd();
              this.finishHandler();
              return;
            }
            start = this.searchHeaderListEnd(chunk, start);
            if (start === -1) {
              this.readState = ReadState.HEADER;
              return;
            }
          }
          const partLength = this.partIndexToLength[this.partIndex];
          const end = start + partLength;
          const effectiveEnd = Math.min(end, chunk.length);
          await this.processPartStarted(chunk, start, effectiveEnd);
          this.remainingPartDataCount = partLength - (effectiveEnd - start);
          if (this.remainingPartDataCount > 0) {
            return;
          }
          start = end + this.boundaryLength;
          if (start >= chunk.length) {
            this.ignoreByteCount = this.boundaryLength - (chunk.length - end);
            return;
          }
        }
      }
      copyExistingData(index, end) {
        return new Promise((resolve5, reject) => {
          const w = () => {
            if (index === end) {
              resolve5();
              return;
            }
            const task = this.options.tasks[index];
            if (task.kind !== downloadPlanBuilder_1.OperationKind.COPY) {
              reject(new Error("Task kind must be COPY"));
              return;
            }
            copyData(task, this.out, this.options.oldFileFd, reject, () => {
              index++;
              w();
            });
          };
          w();
        });
      }
      searchHeaderListEnd(chunk, readOffset) {
        const headerListEnd = chunk.indexOf(DOUBLE_CRLF, readOffset);
        if (headerListEnd !== -1) {
          return headerListEnd + DOUBLE_CRLF.length;
        }
        const partialChunk = readOffset === 0 ? chunk : chunk.slice(readOffset);
        if (this.headerListBuffer == null) {
          this.headerListBuffer = partialChunk;
        } else {
          this.headerListBuffer = Buffer.concat([this.headerListBuffer, partialChunk]);
        }
        return -1;
      }
      onPartEnd() {
        const expectedLength = this.partIndexToLength[this.partIndex - 1];
        if (this.actualPartLength !== expectedLength) {
          throw (0, builder_util_runtime_1.newError)(`Expected length: ${expectedLength} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
        }
        this.actualPartLength = 0;
      }
      processPartStarted(data, start, end) {
        if (this.partIndex !== 0) {
          this.onPartEnd();
        }
        return this.processPartData(data, start, end);
      }
      processPartData(data, start, end) {
        this.actualPartLength += end - start;
        this.transferred += end - start;
        this.delta += end - start;
        const out = this.out;
        if (out.write(start === 0 && data.length === end ? data : data.slice(start, end))) {
          return Promise.resolve();
        } else {
          return new Promise((resolve5, reject) => {
            out.on("error", reject);
            out.once("drain", () => {
              out.removeListener("error", reject);
              resolve5();
            });
          });
        }
      }
    };
    exports2.DataSplitter = DataSplitter;
  }
});

// node_modules/electron-updater/out/differentialDownloader/multipleRangeDownloader.js
var require_multipleRangeDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/multipleRangeDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.executeTasksUsingMultipleRangeRequests = executeTasksUsingMultipleRangeRequests;
    exports2.checkIsRangesSupported = checkIsRangesSupported;
    var builder_util_runtime_1 = require_out();
    var DataSplitter_1 = require_DataSplitter();
    var downloadPlanBuilder_1 = require_downloadPlanBuilder();
    function executeTasksUsingMultipleRangeRequests(differentialDownloader, tasks, out, oldFileFd, reject) {
      const w = (taskOffset) => {
        if (taskOffset >= tasks.length) {
          if (differentialDownloader.fileMetadataBuffer != null) {
            out.write(differentialDownloader.fileMetadataBuffer);
          }
          out.end();
          return;
        }
        const nextOffset = taskOffset + 1e3;
        doExecuteTasks(differentialDownloader, {
          tasks,
          start: taskOffset,
          end: Math.min(tasks.length, nextOffset),
          oldFileFd
        }, out, () => w(nextOffset), reject);
      };
      return w;
    }
    function doExecuteTasks(differentialDownloader, options, out, resolve5, reject) {
      let ranges = "bytes=";
      let partCount = 0;
      let grandTotalBytes = 0;
      const partIndexToTaskIndex = /* @__PURE__ */ new Map();
      const partIndexToLength = [];
      for (let i = options.start; i < options.end; i++) {
        const task = options.tasks[i];
        if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
          ranges += `${task.start}-${task.end - 1}, `;
          partIndexToTaskIndex.set(partCount, i);
          partCount++;
          partIndexToLength.push(task.end - task.start);
          grandTotalBytes += task.end - task.start;
        }
      }
      if (partCount <= 1) {
        const w = (index) => {
          if (index >= options.end) {
            resolve5();
            return;
          }
          const task = options.tasks[index++];
          if (task.kind === downloadPlanBuilder_1.OperationKind.COPY) {
            (0, DataSplitter_1.copyData)(task, out, options.oldFileFd, reject, () => w(index));
          } else {
            const requestOptions2 = differentialDownloader.createRequestOptions();
            requestOptions2.headers.Range = `bytes=${task.start}-${task.end - 1}`;
            const request2 = differentialDownloader.httpExecutor.createRequest(requestOptions2, (response) => {
              response.on("error", reject);
              if (!checkIsRangesSupported(response, reject)) {
                return;
              }
              response.pipe(out, {
                end: false
              });
              response.once("end", () => w(index));
            });
            differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request2, reject);
            request2.end();
          }
        };
        w(options.start);
        return;
      }
      const requestOptions = differentialDownloader.createRequestOptions();
      requestOptions.headers.Range = ranges.substring(0, ranges.length - 2);
      const request = differentialDownloader.httpExecutor.createRequest(requestOptions, (response) => {
        if (!checkIsRangesSupported(response, reject)) {
          return;
        }
        const contentType = (0, builder_util_runtime_1.safeGetHeader)(response, "content-type");
        const m = /^multipart\/.+?\s*;\s*boundary=(?:"([^"]+)"|([^\s";]+))\s*$/i.exec(contentType);
        if (m == null) {
          reject(new Error(`Content-Type "multipart/byteranges" is expected, but got "${contentType}"`));
          return;
        }
        const dicer = new DataSplitter_1.DataSplitter(out, options, partIndexToTaskIndex, m[1] || m[2], partIndexToLength, resolve5, grandTotalBytes, differentialDownloader.options.onProgress);
        dicer.on("error", reject);
        response.pipe(dicer);
        response.on("end", () => {
          setTimeout(() => {
            request.abort();
            reject(new Error("Response ends without calling any handlers"));
          }, 1e4);
        });
      });
      differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
      request.end();
    }
    function checkIsRangesSupported(response, reject) {
      if (response.statusCode >= 400) {
        reject((0, builder_util_runtime_1.createHttpError)(response));
        return false;
      }
      if (response.statusCode !== 206) {
        const acceptRanges = (0, builder_util_runtime_1.safeGetHeader)(response, "accept-ranges");
        if (acceptRanges == null || acceptRanges === "none") {
          reject(new Error(`Server doesn't support Accept-Ranges (response code ${response.statusCode})`));
          return false;
        }
      }
      return true;
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/ProgressDifferentialDownloadCallbackTransform.js
var require_ProgressDifferentialDownloadCallbackTransform = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/ProgressDifferentialDownloadCallbackTransform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgressDifferentialDownloadCallbackTransform = void 0;
    var stream_1 = require("stream");
    var OperationKind;
    (function(OperationKind2) {
      OperationKind2[OperationKind2["COPY"] = 0] = "COPY";
      OperationKind2[OperationKind2["DOWNLOAD"] = 1] = "DOWNLOAD";
    })(OperationKind || (OperationKind = {}));
    var ProgressDifferentialDownloadCallbackTransform = class extends stream_1.Transform {
      constructor(progressDifferentialDownloadInfo, cancellationToken, onProgress) {
        super();
        this.progressDifferentialDownloadInfo = progressDifferentialDownloadInfo;
        this.cancellationToken = cancellationToken;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.transferred = 0;
        this.delta = 0;
        this.expectedBytes = 0;
        this.index = 0;
        this.operationType = OperationKind.COPY;
        this.nextUpdate = this.start + 1e3;
      }
      _transform(chunk, encoding, callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"), null);
          return;
        }
        if (this.operationType == OperationKind.COPY) {
          callback(null, chunk);
          return;
        }
        this.transferred += chunk.length;
        this.delta += chunk.length;
        const now = Date.now();
        if (now >= this.nextUpdate && this.transferred !== this.expectedBytes && this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
          this.nextUpdate = now + 1e3;
          this.onProgress({
            total: this.progressDifferentialDownloadInfo.grandTotal,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
            bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
          });
          this.delta = 0;
        }
        callback(null, chunk);
      }
      beginFileCopy() {
        this.operationType = OperationKind.COPY;
      }
      beginRangeDownload() {
        this.operationType = OperationKind.DOWNLOAD;
        this.expectedBytes += this.progressDifferentialDownloadInfo.expectedByteCounts[this.index++];
      }
      endRangeDownload() {
        if (this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
          this.onProgress({
            total: this.progressDifferentialDownloadInfo.grandTotal,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
            bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
          });
        }
      }
      // Called when we are 100% done with the connection/download
      _flush(callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"));
          return;
        }
        this.onProgress({
          total: this.progressDifferentialDownloadInfo.grandTotal,
          delta: this.delta,
          transferred: this.transferred,
          percent: 100,
          bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
        });
        this.delta = 0;
        this.transferred = 0;
        callback(null);
      }
    };
    exports2.ProgressDifferentialDownloadCallbackTransform = ProgressDifferentialDownloadCallbackTransform;
  }
});

// node_modules/electron-updater/out/differentialDownloader/DifferentialDownloader.js
var require_DifferentialDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/DifferentialDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DifferentialDownloader = void 0;
    var builder_util_runtime_1 = require_out();
    var fs_extra_1 = require_lib();
    var fs_1 = require("fs");
    var DataSplitter_1 = require_DataSplitter();
    var url_1 = require("url");
    var downloadPlanBuilder_1 = require_downloadPlanBuilder();
    var multipleRangeDownloader_1 = require_multipleRangeDownloader();
    var ProgressDifferentialDownloadCallbackTransform_1 = require_ProgressDifferentialDownloadCallbackTransform();
    var DifferentialDownloader = class {
      // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
      constructor(blockAwareFileInfo, httpExecutor, options) {
        this.blockAwareFileInfo = blockAwareFileInfo;
        this.httpExecutor = httpExecutor;
        this.options = options;
        this.fileMetadataBuffer = null;
        this.logger = options.logger;
      }
      createRequestOptions() {
        const result = {
          headers: {
            ...this.options.requestHeaders,
            accept: "*/*"
          }
        };
        (0, builder_util_runtime_1.configureRequestUrl)(this.options.newUrl, result);
        (0, builder_util_runtime_1.configureRequestOptions)(result);
        return result;
      }
      doDownload(oldBlockMap, newBlockMap) {
        if (oldBlockMap.version !== newBlockMap.version) {
          throw new Error(`version is different (${oldBlockMap.version} - ${newBlockMap.version}), full download is required`);
        }
        const logger = this.logger;
        const operations = (0, downloadPlanBuilder_1.computeOperations)(oldBlockMap, newBlockMap, logger);
        if (logger.debug != null) {
          logger.debug(JSON.stringify(operations, null, 2));
        }
        let downloadSize = 0;
        let copySize = 0;
        for (const operation of operations) {
          const length = operation.end - operation.start;
          if (operation.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
            downloadSize += length;
          } else {
            copySize += length;
          }
        }
        const newSize = this.blockAwareFileInfo.size;
        if (downloadSize + copySize + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== newSize) {
          throw new Error(`Internal error, size mismatch: downloadSize: ${downloadSize}, copySize: ${copySize}, newSize: ${newSize}`);
        }
        logger.info(`Full: ${formatBytes(newSize)}, To download: ${formatBytes(downloadSize)} (${Math.round(downloadSize / (newSize / 100))}%)`);
        return this.downloadFile(operations);
      }
      downloadFile(tasks) {
        const fdList = [];
        const closeFiles = () => {
          return Promise.all(fdList.map((openedFile) => {
            return (0, fs_extra_1.close)(openedFile.descriptor).catch((e) => {
              this.logger.error(`cannot close file "${openedFile.path}": ${e}`);
            });
          }));
        };
        return this.doDownloadFile(tasks, fdList).then(closeFiles).catch((e) => {
          return closeFiles().catch((closeFilesError) => {
            try {
              this.logger.error(`cannot close files: ${closeFilesError}`);
            } catch (errorOnLog) {
              try {
                console.error(errorOnLog);
              } catch (_ignored) {
              }
            }
            throw e;
          }).then(() => {
            throw e;
          });
        });
      }
      async doDownloadFile(tasks, fdList) {
        const oldFileFd = await (0, fs_extra_1.open)(this.options.oldFile, "r");
        fdList.push({ descriptor: oldFileFd, path: this.options.oldFile });
        const newFileFd = await (0, fs_extra_1.open)(this.options.newFile, "w");
        fdList.push({ descriptor: newFileFd, path: this.options.newFile });
        const fileOut = (0, fs_1.createWriteStream)(this.options.newFile, { fd: newFileFd });
        await new Promise((resolve5, reject) => {
          const streams = [];
          let downloadInfoTransform = void 0;
          if (!this.options.isUseMultipleRangeRequest && this.options.onProgress) {
            const expectedByteCounts = [];
            let grandTotalBytes = 0;
            for (const task of tasks) {
              if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
                expectedByteCounts.push(task.end - task.start);
                grandTotalBytes += task.end - task.start;
              }
            }
            const progressDifferentialDownloadInfo = {
              expectedByteCounts,
              grandTotal: grandTotalBytes
            };
            downloadInfoTransform = new ProgressDifferentialDownloadCallbackTransform_1.ProgressDifferentialDownloadCallbackTransform(progressDifferentialDownloadInfo, this.options.cancellationToken, this.options.onProgress);
            streams.push(downloadInfoTransform);
          }
          const digestTransform = new builder_util_runtime_1.DigestTransform(this.blockAwareFileInfo.sha512);
          digestTransform.isValidateOnEnd = false;
          streams.push(digestTransform);
          fileOut.on("finish", () => {
            ;
            fileOut.close(() => {
              fdList.splice(1, 1);
              try {
                digestTransform.validate();
              } catch (e) {
                reject(e);
                return;
              }
              resolve5(void 0);
            });
          });
          streams.push(fileOut);
          let lastStream = null;
          for (const stream of streams) {
            stream.on("error", reject);
            if (lastStream == null) {
              lastStream = stream;
            } else {
              lastStream = lastStream.pipe(stream);
            }
          }
          const firstStream = streams[0];
          let w;
          if (this.options.isUseMultipleRangeRequest) {
            w = (0, multipleRangeDownloader_1.executeTasksUsingMultipleRangeRequests)(this, tasks, firstStream, oldFileFd, reject);
            w(0);
            return;
          }
          let downloadOperationCount = 0;
          let actualUrl = null;
          this.logger.info(`Differential download: ${this.options.newUrl}`);
          const requestOptions = this.createRequestOptions();
          requestOptions.redirect = "manual";
          w = (index) => {
            var _a, _b;
            if (index >= tasks.length) {
              if (this.fileMetadataBuffer != null) {
                firstStream.write(this.fileMetadataBuffer);
              }
              firstStream.end();
              return;
            }
            const operation = tasks[index++];
            if (operation.kind === downloadPlanBuilder_1.OperationKind.COPY) {
              if (downloadInfoTransform) {
                downloadInfoTransform.beginFileCopy();
              }
              (0, DataSplitter_1.copyData)(operation, firstStream, oldFileFd, reject, () => w(index));
              return;
            }
            const range = `bytes=${operation.start}-${operation.end - 1}`;
            requestOptions.headers.range = range;
            (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug) === null || _b === void 0 ? void 0 : _b.call(_a, `download range: ${range}`);
            if (downloadInfoTransform) {
              downloadInfoTransform.beginRangeDownload();
            }
            const request = this.httpExecutor.createRequest(requestOptions, (response) => {
              response.on("error", reject);
              response.on("aborted", () => {
                reject(new Error("response has been aborted by the server"));
              });
              if (response.statusCode >= 400) {
                reject((0, builder_util_runtime_1.createHttpError)(response));
              }
              response.pipe(firstStream, {
                end: false
              });
              response.once("end", () => {
                if (downloadInfoTransform) {
                  downloadInfoTransform.endRangeDownload();
                }
                if (++downloadOperationCount === 100) {
                  downloadOperationCount = 0;
                  setTimeout(() => w(index), 1e3);
                } else {
                  w(index);
                }
              });
            });
            request.on("redirect", (statusCode, method, redirectUrl) => {
              this.logger.info(`Redirect to ${removeQuery(redirectUrl)}`);
              actualUrl = redirectUrl;
              (0, builder_util_runtime_1.configureRequestUrl)(new url_1.URL(actualUrl), requestOptions);
              request.followRedirect();
            });
            this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
            request.end();
          };
          w(0);
        });
      }
      async readRemoteBytes(start, endInclusive) {
        const buffer2 = Buffer.allocUnsafe(endInclusive + 1 - start);
        const requestOptions = this.createRequestOptions();
        requestOptions.headers.range = `bytes=${start}-${endInclusive}`;
        let position = 0;
        await this.request(requestOptions, (chunk) => {
          chunk.copy(buffer2, position);
          position += chunk.length;
        });
        if (position !== buffer2.length) {
          throw new Error(`Received data length ${position} is not equal to expected ${buffer2.length}`);
        }
        return buffer2;
      }
      request(requestOptions, dataHandler) {
        return new Promise((resolve5, reject) => {
          const request = this.httpExecutor.createRequest(requestOptions, (response) => {
            if (!(0, multipleRangeDownloader_1.checkIsRangesSupported)(response, reject)) {
              return;
            }
            response.on("error", reject);
            response.on("aborted", () => {
              reject(new Error("response has been aborted by the server"));
            });
            response.on("data", dataHandler);
            response.on("end", () => resolve5());
          });
          this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
          request.end();
        });
      }
    };
    exports2.DifferentialDownloader = DifferentialDownloader;
    function formatBytes(value, symbol = " KB") {
      return new Intl.NumberFormat("en").format((value / 1024).toFixed(2)) + symbol;
    }
    function removeQuery(url) {
      const index = url.indexOf("?");
      return index < 0 ? url : url.substring(0, index);
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/GenericDifferentialDownloader.js
var require_GenericDifferentialDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/GenericDifferentialDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericDifferentialDownloader = void 0;
    var DifferentialDownloader_1 = require_DifferentialDownloader();
    var GenericDifferentialDownloader = class extends DifferentialDownloader_1.DifferentialDownloader {
      download(oldBlockMap, newBlockMap) {
        return this.doDownload(oldBlockMap, newBlockMap);
      }
    };
    exports2.GenericDifferentialDownloader = GenericDifferentialDownloader;
  }
});

// node_modules/electron-updater/out/types.js
var require_types = __commonJS({
  "node_modules/electron-updater/out/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UpdaterSignal = exports2.UPDATE_DOWNLOADED = exports2.DOWNLOAD_PROGRESS = exports2.CancellationToken = void 0;
    exports2.addHandler = addHandler;
    var builder_util_runtime_1 = require_out();
    Object.defineProperty(exports2, "CancellationToken", { enumerable: true, get: function() {
      return builder_util_runtime_1.CancellationToken;
    } });
    exports2.DOWNLOAD_PROGRESS = "download-progress";
    exports2.UPDATE_DOWNLOADED = "update-downloaded";
    var UpdaterSignal = class {
      constructor(emitter) {
        this.emitter = emitter;
      }
      /**
       * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
       */
      login(handler) {
        addHandler(this.emitter, "login", handler);
      }
      progress(handler) {
        addHandler(this.emitter, exports2.DOWNLOAD_PROGRESS, handler);
      }
      updateDownloaded(handler) {
        addHandler(this.emitter, exports2.UPDATE_DOWNLOADED, handler);
      }
      updateCancelled(handler) {
        addHandler(this.emitter, "update-cancelled", handler);
      }
    };
    exports2.UpdaterSignal = UpdaterSignal;
    var isLogEvent = false;
    function addHandler(emitter, event, handler) {
      if (isLogEvent) {
        emitter.on(event, (...args) => {
          console.log("%s %s", event, args);
          handler(...args);
        });
      } else {
        emitter.on(event, handler);
      }
    }
  }
});

// node_modules/electron-updater/out/AppUpdater.js
var require_AppUpdater = __commonJS({
  "node_modules/electron-updater/out/AppUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoOpLogger = exports2.AppUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var crypto_1 = require("crypto");
    var os_1 = require("os");
    var events_1 = require("events");
    var fs_extra_1 = require_lib();
    var js_yaml_1 = require_js_yaml();
    var lazy_val_1 = require_main();
    var path16 = require("path");
    var semver_1 = require_semver2();
    var DownloadedUpdateHelper_1 = require_DownloadedUpdateHelper();
    var ElectronAppAdapter_1 = require_ElectronAppAdapter();
    var electronHttpExecutor_1 = require_electronHttpExecutor();
    var GenericProvider_1 = require_GenericProvider();
    var providerFactory_1 = require_providerFactory();
    var zlib_1 = require("zlib");
    var GenericDifferentialDownloader_1 = require_GenericDifferentialDownloader();
    var types_1 = require_types();
    var AppUpdater = class _AppUpdater extends events_1.EventEmitter {
      /**
       * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
       */
      get channel() {
        return this._channel;
      }
      /**
       * Set the update channel. Overrides `channel` in the update configuration.
       *
       * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
       */
      set channel(value) {
        if (this._channel != null) {
          if (typeof value !== "string") {
            throw (0, builder_util_runtime_1.newError)(`Channel must be a string, but got: ${value}`, "ERR_UPDATER_INVALID_CHANNEL");
          } else if (value.length === 0) {
            throw (0, builder_util_runtime_1.newError)(`Channel must be not an empty string`, "ERR_UPDATER_INVALID_CHANNEL");
          }
        }
        this._channel = value;
        this.allowDowngrade = true;
      }
      /**
       *  Shortcut for explicitly adding auth tokens to request headers
       */
      addAuthHeader(token) {
        this.requestHeaders = Object.assign({}, this.requestHeaders, {
          authorization: token
        });
      }
      // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
      get netSession() {
        return (0, electronHttpExecutor_1.getNetSession)();
      }
      /**
       * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
       * Set it to `null` if you would like to disable a logging feature.
       */
      get logger() {
        return this._logger;
      }
      set logger(value) {
        this._logger = value == null ? new NoOpLogger() : value;
      }
      // noinspection JSUnusedGlobalSymbols
      /**
       * test only
       * @private
       */
      set updateConfigPath(value) {
        this.clientPromise = null;
        this._appUpdateConfigPath = value;
        this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
      }
      /**
       * Allows developer to override default logic for determining if an update is supported.
       * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
       */
      get isUpdateSupported() {
        return this._isUpdateSupported;
      }
      set isUpdateSupported(value) {
        if (value) {
          this._isUpdateSupported = value;
        }
      }
      /**
       * Allows developer to override default logic for determining if the user is below the rollout threshold.
       * The default logic compares the staging percentage with numerical representation of user ID.
       * An override can define custom logic, or bypass it if needed.
       */
      get isUserWithinRollout() {
        return this._isUserWithinRollout;
      }
      set isUserWithinRollout(value) {
        if (value) {
          this._isUserWithinRollout = value;
        }
      }
      constructor(options, app6) {
        super();
        this.autoDownload = true;
        this.autoInstallOnAppQuit = true;
        this.autoRunAppAfterInstall = true;
        this.allowPrerelease = false;
        this.fullChangelog = false;
        this.allowDowngrade = false;
        this.disableWebInstaller = false;
        this.disableDifferentialDownload = false;
        this.forceDevUpdateConfig = false;
        this.previousBlockmapBaseUrlOverride = null;
        this._channel = null;
        this.downloadedUpdateHelper = null;
        this.requestHeaders = null;
        this._logger = console;
        this.signals = new types_1.UpdaterSignal(this);
        this._appUpdateConfigPath = null;
        this._isUpdateSupported = (updateInfo) => this.checkIfUpdateSupported(updateInfo);
        this._isUserWithinRollout = (updateInfo) => this.isStagingMatch(updateInfo);
        this.clientPromise = null;
        this.stagingUserIdPromise = new lazy_val_1.Lazy(() => this.getOrCreateStagingUserId());
        this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
        this.checkForUpdatesPromise = null;
        this.downloadPromise = null;
        this.updateInfoAndProvider = null;
        this._testOnlyOptions = null;
        this.on("error", (error) => {
          this._logger.error(`Error: ${error.stack || error.message}`);
        });
        if (app6 == null) {
          this.app = new ElectronAppAdapter_1.ElectronAppAdapter();
          this.httpExecutor = new electronHttpExecutor_1.ElectronHttpExecutor((authInfo, callback) => this.emit("login", authInfo, callback));
        } else {
          this.app = app6;
          this.httpExecutor = null;
        }
        const currentVersionString = this.app.version;
        const currentVersion = (0, semver_1.parse)(currentVersionString);
        if (currentVersion == null) {
          throw (0, builder_util_runtime_1.newError)(`App version is not a valid semver version: "${currentVersionString}"`, "ERR_UPDATER_INVALID_VERSION");
        }
        this.currentVersion = currentVersion;
        this.allowPrerelease = hasPrereleaseComponents(currentVersion);
        if (options != null) {
          this.setFeedURL(options);
          if (typeof options !== "string" && options.requestHeaders) {
            this.requestHeaders = options.requestHeaders;
          }
        }
      }
      //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
      getFeedURL() {
        return "Deprecated. Do not use it.";
      }
      /**
       * Configure update provider. If value is `string`, [GenericServerOptions](./publish.md#genericserveroptions) will be set with value as `url`.
       * @param options If you want to override configuration in the `app-update.yml`.
       */
      setFeedURL(options) {
        const runtimeOptions = this.createProviderRuntimeOptions();
        let provider;
        if (typeof options === "string") {
          provider = new GenericProvider_1.GenericProvider({ provider: "generic", url: options }, this, {
            ...runtimeOptions,
            isUseMultipleRangeRequest: (0, providerFactory_1.isUrlProbablySupportMultiRangeRequests)(options)
          });
        } else {
          provider = (0, providerFactory_1.createClient)(options, this, runtimeOptions);
        }
        this.clientPromise = Promise.resolve(provider);
      }
      /**
       * Asks the server whether there is an update.
       * @returns null if the updater is disabled, otherwise info about the latest version
       */
      checkForUpdates() {
        if (!this.isUpdaterActive()) {
          return Promise.resolve(null);
        }
        let checkForUpdatesPromise = this.checkForUpdatesPromise;
        if (checkForUpdatesPromise != null) {
          this._logger.info("Checking for update (already in progress)");
          return checkForUpdatesPromise;
        }
        const nullizePromise = () => this.checkForUpdatesPromise = null;
        this._logger.info("Checking for update");
        checkForUpdatesPromise = this.doCheckForUpdates().then((it) => {
          nullizePromise();
          return it;
        }).catch((e) => {
          nullizePromise();
          this.emit("error", e, `Cannot check for updates: ${(e.stack || e).toString()}`);
          throw e;
        });
        this.checkForUpdatesPromise = checkForUpdatesPromise;
        return checkForUpdatesPromise;
      }
      isUpdaterActive() {
        const isEnabled = this.app.isPackaged || this.forceDevUpdateConfig;
        if (!isEnabled) {
          this._logger.info("Skip checkForUpdates because application is not packed and dev update config is not forced");
          return false;
        }
        return true;
      }
      // noinspection JSUnusedGlobalSymbols
      checkForUpdatesAndNotify(downloadNotification) {
        return this.checkForUpdates().then((it) => {
          if (!(it === null || it === void 0 ? void 0 : it.downloadPromise)) {
            if (this._logger.debug != null) {
              this._logger.debug("checkForUpdatesAndNotify called, downloadPromise is null");
            }
            return it;
          }
          void it.downloadPromise.then(() => {
            const notificationContent = _AppUpdater.formatDownloadNotification(it.updateInfo.version, this.app.name, downloadNotification);
            new (require("electron")).Notification(notificationContent).show();
          });
          return it;
        });
      }
      static formatDownloadNotification(version, appName, downloadNotification) {
        if (downloadNotification == null) {
          downloadNotification = {
            title: "A new update is ready to install",
            body: `{appName} version {version} has been downloaded and will be automatically installed on exit`
          };
        }
        downloadNotification = {
          title: downloadNotification.title.replace("{appName}", appName).replace("{version}", version),
          body: downloadNotification.body.replace("{appName}", appName).replace("{version}", version)
        };
        return downloadNotification;
      }
      async isStagingMatch(updateInfo) {
        const rawStagingPercentage = updateInfo.stagingPercentage;
        let stagingPercentage = rawStagingPercentage;
        if (stagingPercentage == null) {
          return true;
        }
        stagingPercentage = parseInt(stagingPercentage, 10);
        if (isNaN(stagingPercentage)) {
          this._logger.warn(`Staging percentage is NaN: ${rawStagingPercentage}`);
          return true;
        }
        stagingPercentage = stagingPercentage / 100;
        const stagingUserId = await this.stagingUserIdPromise.value;
        const val = builder_util_runtime_1.UUID.parse(stagingUserId).readUInt32BE(12);
        const percentage = val / 4294967295;
        this._logger.info(`Staging percentage: ${stagingPercentage}, percentage: ${percentage}, user id: ${stagingUserId}`);
        return percentage < stagingPercentage;
      }
      computeFinalHeaders(headers) {
        if (this.requestHeaders != null) {
          Object.assign(headers, this.requestHeaders);
        }
        return headers;
      }
      async isUpdateAvailable(updateInfo) {
        const latestVersion = (0, semver_1.parse)(updateInfo.version);
        if (latestVersion == null) {
          throw (0, builder_util_runtime_1.newError)(`This file could not be downloaded, or the latest version (from update server) does not have a valid semver version: "${updateInfo.version}"`, "ERR_UPDATER_INVALID_VERSION");
        }
        const currentVersion = this.currentVersion;
        if ((0, semver_1.eq)(latestVersion, currentVersion)) {
          return false;
        }
        if (!await Promise.resolve(this.isUpdateSupported(updateInfo))) {
          return false;
        }
        const isUserWithinRollout = await Promise.resolve(this.isUserWithinRollout(updateInfo));
        if (!isUserWithinRollout) {
          return false;
        }
        const isLatestVersionNewer = (0, semver_1.gt)(latestVersion, currentVersion);
        const isLatestVersionOlder = (0, semver_1.lt)(latestVersion, currentVersion);
        if (isLatestVersionNewer) {
          return true;
        }
        return this.allowDowngrade && isLatestVersionOlder;
      }
      checkIfUpdateSupported(updateInfo) {
        const minimumSystemVersion = updateInfo === null || updateInfo === void 0 ? void 0 : updateInfo.minimumSystemVersion;
        const currentOSVersion = (0, os_1.release)();
        if (minimumSystemVersion) {
          try {
            if ((0, semver_1.lt)(currentOSVersion, minimumSystemVersion)) {
              this._logger.info(`Current OS version ${currentOSVersion} is less than the minimum OS version required ${minimumSystemVersion} for version ${currentOSVersion}`);
              return false;
            }
          } catch (e) {
            this._logger.warn(`Failed to compare current OS version(${currentOSVersion}) with minimum OS version(${minimumSystemVersion}): ${(e.message || e).toString()}`);
          }
        }
        return true;
      }
      async getUpdateInfoAndProvider() {
        await this.app.whenReady();
        if (this.clientPromise == null) {
          this.clientPromise = this.configOnDisk.value.then((it) => (0, providerFactory_1.createClient)(it, this, this.createProviderRuntimeOptions()));
        }
        const client = await this.clientPromise;
        const stagingUserId = await this.stagingUserIdPromise.value;
        client.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": stagingUserId }));
        return {
          info: await client.getLatestVersion(),
          provider: client
        };
      }
      createProviderRuntimeOptions() {
        return {
          isUseMultipleRangeRequest: true,
          platform: this._testOnlyOptions == null ? process.platform : this._testOnlyOptions.platform,
          executor: this.httpExecutor
        };
      }
      async doCheckForUpdates() {
        this.emit("checking-for-update");
        const result = await this.getUpdateInfoAndProvider();
        const updateInfo = result.info;
        if (!await this.isUpdateAvailable(updateInfo)) {
          this._logger.info(`Update for version ${this.currentVersion.format()} is not available (latest version: ${updateInfo.version}, downgrade is ${this.allowDowngrade ? "allowed" : "disallowed"}).`);
          this.emit("update-not-available", updateInfo);
          return {
            isUpdateAvailable: false,
            versionInfo: updateInfo,
            updateInfo
          };
        }
        this.updateInfoAndProvider = result;
        this.onUpdateAvailable(updateInfo);
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        return {
          isUpdateAvailable: true,
          versionInfo: updateInfo,
          updateInfo,
          cancellationToken,
          downloadPromise: this.autoDownload ? this.downloadUpdate(cancellationToken) : null
        };
      }
      onUpdateAvailable(updateInfo) {
        this._logger.info(`Found version ${updateInfo.version} (url: ${(0, builder_util_runtime_1.asArray)(updateInfo.files).map((it) => it.url).join(", ")})`);
        this.emit("update-available", updateInfo);
      }
      /**
       * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
       * @returns {Promise<Array<string>>} Paths to downloaded files.
       */
      downloadUpdate(cancellationToken = new builder_util_runtime_1.CancellationToken()) {
        const updateInfoAndProvider = this.updateInfoAndProvider;
        if (updateInfoAndProvider == null) {
          const error = new Error("Please check update first");
          this.dispatchError(error);
          return Promise.reject(error);
        }
        if (this.downloadPromise != null) {
          this._logger.info("Downloading update (already in progress)");
          return this.downloadPromise;
        }
        this._logger.info(`Downloading update from ${(0, builder_util_runtime_1.asArray)(updateInfoAndProvider.info.files).map((it) => it.url).join(", ")}`);
        const errorHandler = (e) => {
          if (!(e instanceof builder_util_runtime_1.CancellationError)) {
            try {
              this.dispatchError(e);
            } catch (nestedError) {
              this._logger.warn(`Cannot dispatch error event: ${nestedError.stack || nestedError}`);
            }
          }
          return e;
        };
        this.downloadPromise = this.doDownloadUpdate({
          updateInfoAndProvider,
          requestHeaders: this.computeRequestHeaders(updateInfoAndProvider.provider),
          cancellationToken,
          disableWebInstaller: this.disableWebInstaller,
          disableDifferentialDownload: this.disableDifferentialDownload
        }).catch((e) => {
          throw errorHandler(e);
        }).finally(() => {
          this.downloadPromise = null;
        });
        return this.downloadPromise;
      }
      dispatchError(e) {
        this.emit("error", e, (e.stack || e).toString());
      }
      dispatchUpdateDownloaded(event) {
        this.emit(types_1.UPDATE_DOWNLOADED, event);
      }
      async loadUpdateConfig() {
        if (this._appUpdateConfigPath == null) {
          this._appUpdateConfigPath = this.app.appUpdateConfigPath;
        }
        return (0, js_yaml_1.load)(await (0, fs_extra_1.readFile)(this._appUpdateConfigPath, "utf-8"));
      }
      computeRequestHeaders(provider) {
        const fileExtraDownloadHeaders = provider.fileExtraDownloadHeaders;
        if (fileExtraDownloadHeaders != null) {
          const requestHeaders = this.requestHeaders;
          return requestHeaders == null ? fileExtraDownloadHeaders : {
            ...fileExtraDownloadHeaders,
            ...requestHeaders
          };
        }
        return this.computeFinalHeaders({ accept: "*/*" });
      }
      async getOrCreateStagingUserId() {
        const file = path16.join(this.app.userDataPath, ".updaterId");
        try {
          const id2 = await (0, fs_extra_1.readFile)(file, "utf-8");
          if (builder_util_runtime_1.UUID.check(id2)) {
            return id2;
          } else {
            this._logger.warn(`Staging user id file exists, but content was invalid: ${id2}`);
          }
        } catch (e) {
          if (e.code !== "ENOENT") {
            this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${e}`);
          }
        }
        const id = builder_util_runtime_1.UUID.v5((0, crypto_1.randomBytes)(4096), builder_util_runtime_1.UUID.OID);
        this._logger.info(`Generated new staging user ID: ${id}`);
        try {
          await (0, fs_extra_1.outputFile)(file, id);
        } catch (e) {
          this._logger.warn(`Couldn't write out staging user ID: ${e}`);
        }
        return id;
      }
      /** @internal */
      get isAddNoCacheQuery() {
        const headers = this.requestHeaders;
        if (headers == null) {
          return true;
        }
        for (const headerName of Object.keys(headers)) {
          const s = headerName.toLowerCase();
          if (s === "authorization" || s === "private-token") {
            return false;
          }
        }
        return true;
      }
      async getOrCreateDownloadHelper() {
        let result = this.downloadedUpdateHelper;
        if (result == null) {
          const dirName = (await this.configOnDisk.value).updaterCacheDirName;
          const logger = this._logger;
          if (dirName == null) {
            logger.error("updaterCacheDirName is not specified in app-update.yml Was app build using at least electron-builder 20.34.0?");
          }
          const cacheDir = path16.join(this.app.baseCachePath, dirName || this.app.name);
          if (logger.debug != null) {
            logger.debug(`updater cache dir: ${cacheDir}`);
          }
          result = new DownloadedUpdateHelper_1.DownloadedUpdateHelper(cacheDir);
          this.downloadedUpdateHelper = result;
        }
        return result;
      }
      async executeDownload(taskOptions) {
        const fileInfo = taskOptions.fileInfo;
        const downloadOptions = {
          headers: taskOptions.downloadUpdateOptions.requestHeaders,
          cancellationToken: taskOptions.downloadUpdateOptions.cancellationToken,
          sha2: fileInfo.info.sha2,
          sha512: fileInfo.info.sha512
        };
        if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
          downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
        }
        const updateInfo = taskOptions.downloadUpdateOptions.updateInfoAndProvider.info;
        const version = updateInfo.version;
        const packageInfo = fileInfo.packageInfo;
        function getCacheUpdateFileName() {
          const urlPath = decodeURIComponent(taskOptions.fileInfo.url.pathname);
          if (urlPath.toLowerCase().endsWith(`.${taskOptions.fileExtension.toLowerCase()}`)) {
            return path16.basename(urlPath);
          } else {
            return taskOptions.fileInfo.info.url;
          }
        }
        const downloadedUpdateHelper = await this.getOrCreateDownloadHelper();
        const cacheDir = downloadedUpdateHelper.cacheDirForPendingUpdate;
        await (0, fs_extra_1.mkdir)(cacheDir, { recursive: true });
        const updateFileName = getCacheUpdateFileName();
        let updateFile = path16.join(cacheDir, updateFileName);
        const packageFile = packageInfo == null ? null : path16.join(cacheDir, `package-${version}${path16.extname(packageInfo.path) || ".7z"}`);
        const done = async (isSaveCache) => {
          await downloadedUpdateHelper.setDownloadedFile(updateFile, packageFile, updateInfo, fileInfo, updateFileName, isSaveCache);
          await taskOptions.done({
            ...updateInfo,
            downloadedFile: updateFile
          });
          const currentBlockMapFile = path16.join(cacheDir, "current.blockmap");
          if (await (0, fs_extra_1.pathExists)(currentBlockMapFile)) {
            await (0, fs_extra_1.copyFile)(currentBlockMapFile, path16.join(downloadedUpdateHelper.cacheDir, "current.blockmap"));
          }
          return packageFile == null ? [updateFile] : [updateFile, packageFile];
        };
        const log = this._logger;
        const cachedUpdateFile = await downloadedUpdateHelper.validateDownloadedPath(updateFile, updateInfo, fileInfo, log);
        if (cachedUpdateFile != null) {
          updateFile = cachedUpdateFile;
          return await done(false);
        }
        const removeFileIfAny = async () => {
          await downloadedUpdateHelper.clear().catch(() => {
          });
          return await (0, fs_extra_1.unlink)(updateFile).catch(() => {
          });
        };
        const tempUpdateFile = await (0, DownloadedUpdateHelper_1.createTempUpdateFile)(`temp-${updateFileName}`, cacheDir, log);
        try {
          await taskOptions.task(tempUpdateFile, downloadOptions, packageFile, removeFileIfAny);
          await (0, builder_util_runtime_1.retry)(() => (0, fs_extra_1.rename)(tempUpdateFile, updateFile), {
            retries: 60,
            interval: 500,
            shouldRetry: (error) => {
              if (error instanceof Error && /^EBUSY:/.test(error.message)) {
                return true;
              }
              log.warn(`Cannot rename temp file to final file: ${error.message || error.stack}`);
              return false;
            }
          });
        } catch (e) {
          await removeFileIfAny();
          if (e instanceof builder_util_runtime_1.CancellationError) {
            log.info("cancelled");
            this.emit("update-cancelled", updateInfo);
          }
          throw e;
        }
        log.info(`New version ${version} has been downloaded to ${updateFile}`);
        return await done(true);
      }
      async differentialDownloadInstaller(fileInfo, downloadUpdateOptions, installerPath, provider, oldInstallerFileName) {
        try {
          if (this._testOnlyOptions != null && !this._testOnlyOptions.isUseDifferentialDownload) {
            return true;
          }
          const provider2 = downloadUpdateOptions.updateInfoAndProvider.provider;
          const blockmapFileUrls = await provider2.getBlockMapFiles(fileInfo.url, this.app.version, downloadUpdateOptions.updateInfoAndProvider.info.version, this.previousBlockmapBaseUrlOverride);
          this._logger.info(`Download block maps (old: "${blockmapFileUrls[0]}", new: ${blockmapFileUrls[1]})`);
          const downloadBlockMap = async (url) => {
            const data = await this.httpExecutor.downloadToBuffer(url, {
              headers: downloadUpdateOptions.requestHeaders,
              cancellationToken: downloadUpdateOptions.cancellationToken
            });
            if (data == null || data.length === 0) {
              throw new Error(`Blockmap "${url.href}" is empty`);
            }
            try {
              return JSON.parse((0, zlib_1.gunzipSync)(data).toString());
            } catch (e) {
              throw new Error(`Cannot parse blockmap "${url.href}", error: ${e}`);
            }
          };
          const downloadOptions = {
            newUrl: fileInfo.url,
            oldFile: path16.join(this.downloadedUpdateHelper.cacheDir, oldInstallerFileName),
            logger: this._logger,
            newFile: installerPath,
            isUseMultipleRangeRequest: provider2.isUseMultipleRangeRequest,
            requestHeaders: downloadUpdateOptions.requestHeaders,
            cancellationToken: downloadUpdateOptions.cancellationToken
          };
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          const saveBlockMapToCacheDir = async (blockMapData, cacheDir) => {
            const blockMapFile = path16.join(cacheDir, "current.blockmap");
            await (0, fs_extra_1.outputFile)(blockMapFile, (0, zlib_1.gzipSync)(JSON.stringify(blockMapData)));
          };
          const getBlockMapFromCacheDir = async (cacheDir) => {
            const blockMapFile = path16.join(cacheDir, "current.blockmap");
            try {
              if (await (0, fs_extra_1.pathExists)(blockMapFile)) {
                return JSON.parse((0, zlib_1.gunzipSync)(await (0, fs_extra_1.readFile)(blockMapFile)).toString());
              }
            } catch (e) {
              this._logger.warn(`Cannot parse blockmap "${blockMapFile}", error: ${e}`);
            }
            return null;
          };
          const newBlockMapData = await downloadBlockMap(blockmapFileUrls[1]);
          await saveBlockMapToCacheDir(newBlockMapData, this.downloadedUpdateHelper.cacheDirForPendingUpdate);
          let oldBlockMapData = await getBlockMapFromCacheDir(this.downloadedUpdateHelper.cacheDir);
          if (oldBlockMapData == null) {
            oldBlockMapData = await downloadBlockMap(blockmapFileUrls[0]);
          }
          await new GenericDifferentialDownloader_1.GenericDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download(oldBlockMapData, newBlockMapData);
          return false;
        } catch (e) {
          this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
          if (this._testOnlyOptions != null) {
            throw e;
          }
          return true;
        }
      }
    };
    exports2.AppUpdater = AppUpdater;
    function hasPrereleaseComponents(version) {
      const versionPrereleaseComponent = (0, semver_1.prerelease)(version);
      return versionPrereleaseComponent != null && versionPrereleaseComponent.length > 0;
    }
    var NoOpLogger = class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      info(message) {
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      warn(message) {
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      error(message) {
      }
    };
    exports2.NoOpLogger = NoOpLogger;
  }
});

// node_modules/electron-updater/out/BaseUpdater.js
var require_BaseUpdater = __commonJS({
  "node_modules/electron-updater/out/BaseUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BaseUpdater = void 0;
    var child_process_1 = require("child_process");
    var AppUpdater_1 = require_AppUpdater();
    var BaseUpdater = class extends AppUpdater_1.AppUpdater {
      constructor(options, app6) {
        super(options, app6);
        this.quitAndInstallCalled = false;
        this.quitHandlerAdded = false;
      }
      quitAndInstall(isSilent = false, isForceRunAfter = false) {
        this._logger.info(`Install on explicit quitAndInstall`);
        const isInstalled = this.install(isSilent, isSilent ? isForceRunAfter : this.autoRunAppAfterInstall);
        if (isInstalled) {
          setImmediate(() => {
            require("electron").autoUpdater.emit("before-quit-for-update");
            this.app.quit();
          });
        } else {
          this.quitAndInstallCalled = false;
        }
      }
      executeDownload(taskOptions) {
        return super.executeDownload({
          ...taskOptions,
          done: (event) => {
            this.dispatchUpdateDownloaded(event);
            this.addQuitHandler();
            return Promise.resolve();
          }
        });
      }
      get installerPath() {
        return this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.file;
      }
      // must be sync (because quit even handler is not async)
      install(isSilent = false, isForceRunAfter = false) {
        if (this.quitAndInstallCalled) {
          this._logger.warn("install call ignored: quitAndInstallCalled is set to true");
          return false;
        }
        const downloadedUpdateHelper = this.downloadedUpdateHelper;
        const installerPath = this.installerPath;
        const downloadedFileInfo = downloadedUpdateHelper == null ? null : downloadedUpdateHelper.downloadedFileInfo;
        if (installerPath == null || downloadedFileInfo == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        this.quitAndInstallCalled = true;
        try {
          this._logger.info(`Install: isSilent: ${isSilent}, isForceRunAfter: ${isForceRunAfter}`);
          return this.doInstall({
            isSilent,
            isForceRunAfter,
            isAdminRightsRequired: downloadedFileInfo.isAdminRightsRequired
          });
        } catch (e) {
          this.dispatchError(e);
          return false;
        }
      }
      addQuitHandler() {
        if (this.quitHandlerAdded || !this.autoInstallOnAppQuit) {
          return;
        }
        this.quitHandlerAdded = true;
        this.app.onQuit((exitCode) => {
          if (this.quitAndInstallCalled) {
            this._logger.info("Update installer has already been triggered. Quitting application.");
            return;
          }
          if (!this.autoInstallOnAppQuit) {
            this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
            return;
          }
          if (exitCode !== 0) {
            this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${exitCode}`);
            return;
          }
          this._logger.info("Auto install update on quit");
          this.install(true, false);
        });
      }
      spawnSyncLog(cmd, args = [], env = {}) {
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        const response = (0, child_process_1.spawnSync)(cmd, args, {
          env: { ...process.env, ...env },
          encoding: "utf-8",
          shell: true
        });
        const { error, status, stdout, stderr } = response;
        if (error != null) {
          this._logger.error(stderr);
          throw error;
        } else if (status != null && status !== 0) {
          this._logger.error(stderr);
          throw new Error(`Command ${cmd} exited with code ${status}`);
        }
        return stdout.trim();
      }
      /**
       * This handles both node 8 and node 10 way of emitting error when spawning a process
       *   - node 8: Throws the error
       *   - node 10: Emit the error(Need to listen with on)
       */
      // https://github.com/electron-userland/electron-builder/issues/1129
      // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
      async spawnLog(cmd, args = [], env = void 0, stdio = "ignore") {
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        return new Promise((resolve5, reject) => {
          try {
            const params = { stdio, env, detached: true };
            const p = (0, child_process_1.spawn)(cmd, args, params);
            p.on("error", (error) => {
              reject(error);
            });
            p.unref();
            if (p.pid !== void 0) {
              resolve5(true);
            }
          } catch (error) {
            reject(error);
          }
        });
      }
    };
    exports2.BaseUpdater = BaseUpdater;
  }
});

// node_modules/electron-updater/out/differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader.js
var require_FileWithEmbeddedBlockMapDifferentialDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileWithEmbeddedBlockMapDifferentialDownloader = void 0;
    var fs_extra_1 = require_lib();
    var DifferentialDownloader_1 = require_DifferentialDownloader();
    var zlib_1 = require("zlib");
    var FileWithEmbeddedBlockMapDifferentialDownloader = class extends DifferentialDownloader_1.DifferentialDownloader {
      async download() {
        const packageInfo = this.blockAwareFileInfo;
        const fileSize = packageInfo.size;
        const offset = fileSize - (packageInfo.blockMapSize + 4);
        this.fileMetadataBuffer = await this.readRemoteBytes(offset, fileSize - 1);
        const newBlockMap = readBlockMap(this.fileMetadataBuffer.slice(0, this.fileMetadataBuffer.length - 4));
        await this.doDownload(await readEmbeddedBlockMapData(this.options.oldFile), newBlockMap);
      }
    };
    exports2.FileWithEmbeddedBlockMapDifferentialDownloader = FileWithEmbeddedBlockMapDifferentialDownloader;
    function readBlockMap(data) {
      return JSON.parse((0, zlib_1.inflateRawSync)(data).toString());
    }
    async function readEmbeddedBlockMapData(file) {
      const fd = await (0, fs_extra_1.open)(file, "r");
      try {
        const fileSize = (await (0, fs_extra_1.fstat)(fd)).size;
        const sizeBuffer = Buffer.allocUnsafe(4);
        await (0, fs_extra_1.read)(fd, sizeBuffer, 0, sizeBuffer.length, fileSize - sizeBuffer.length);
        const dataBuffer = Buffer.allocUnsafe(sizeBuffer.readUInt32BE(0));
        await (0, fs_extra_1.read)(fd, dataBuffer, 0, dataBuffer.length, fileSize - sizeBuffer.length - dataBuffer.length);
        await (0, fs_extra_1.close)(fd);
        return readBlockMap(dataBuffer);
      } catch (e) {
        await (0, fs_extra_1.close)(fd);
        throw e;
      }
    }
  }
});

// node_modules/electron-updater/out/AppImageUpdater.js
var require_AppImageUpdater = __commonJS({
  "node_modules/electron-updater/out/AppImageUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AppImageUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var child_process_1 = require("child_process");
    var fs_extra_1 = require_lib();
    var fs_1 = require("fs");
    var path16 = require("path");
    var BaseUpdater_1 = require_BaseUpdater();
    var FileWithEmbeddedBlockMapDifferentialDownloader_1 = require_FileWithEmbeddedBlockMapDifferentialDownloader();
    var Provider_1 = require_Provider();
    var types_1 = require_types();
    var AppImageUpdater = class extends BaseUpdater_1.BaseUpdater {
      constructor(options, app6) {
        super(options, app6);
      }
      isUpdaterActive() {
        if (process.env["APPIMAGE"] == null && !this.forceDevUpdateConfig) {
          if (process.env["SNAP"] == null) {
            this._logger.warn("APPIMAGE env is not defined, current application is not an AppImage");
          } else {
            this._logger.info("SNAP env is defined, updater is disabled");
          }
          return false;
        }
        return super.isUpdaterActive();
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "AppImage", ["rpm", "deb", "pacman"]);
        return this.executeDownload({
          fileExtension: "AppImage",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            const oldFile = process.env["APPIMAGE"];
            if (oldFile == null) {
              throw (0, builder_util_runtime_1.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
            }
            if (downloadUpdateOptions.disableDifferentialDownload || await this.downloadDifferential(fileInfo, oldFile, updateFile, provider, downloadUpdateOptions)) {
              await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
            }
            await (0, fs_extra_1.chmod)(updateFile, 493);
          }
        });
      }
      async downloadDifferential(fileInfo, oldFile, updateFile, provider, downloadUpdateOptions) {
        try {
          const downloadOptions = {
            newUrl: fileInfo.url,
            oldFile,
            logger: this._logger,
            newFile: updateFile,
            isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
            requestHeaders: downloadUpdateOptions.requestHeaders,
            cancellationToken: downloadUpdateOptions.cancellationToken
          };
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await new FileWithEmbeddedBlockMapDifferentialDownloader_1.FileWithEmbeddedBlockMapDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download();
          return false;
        } catch (e) {
          this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
          return process.platform === "linux";
        }
      }
      doInstall(options) {
        const appImageFile = process.env["APPIMAGE"];
        if (appImageFile == null) {
          throw (0, builder_util_runtime_1.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
        }
        (0, fs_1.unlinkSync)(appImageFile);
        let destination;
        const existingBaseName = path16.basename(appImageFile);
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        if (path16.basename(installerPath) === existingBaseName || !/\d+\.\d+\.\d+/.test(existingBaseName)) {
          destination = appImageFile;
        } else {
          destination = path16.join(path16.dirname(appImageFile), path16.basename(installerPath));
        }
        (0, child_process_1.execFileSync)("mv", ["-f", installerPath, destination]);
        if (destination !== appImageFile) {
          this.emit("appimage-filename-updated", destination);
        }
        const env = {
          ...process.env,
          APPIMAGE_SILENT_INSTALL: "true"
        };
        if (options.isForceRunAfter) {
          this.spawnLog(destination, [], env);
        } else {
          env.APPIMAGE_EXIT_AFTER_INSTALL = "true";
          (0, child_process_1.execFileSync)(destination, [], { env });
        }
        return true;
      }
    };
    exports2.AppImageUpdater = AppImageUpdater;
  }
});

// node_modules/electron-updater/out/LinuxUpdater.js
var require_LinuxUpdater = __commonJS({
  "node_modules/electron-updater/out/LinuxUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LinuxUpdater = void 0;
    var BaseUpdater_1 = require_BaseUpdater();
    var LinuxUpdater = class extends BaseUpdater_1.BaseUpdater {
      constructor(options, app6) {
        super(options, app6);
      }
      /**
       * Returns true if the current process is running as root.
       */
      isRunningAsRoot() {
        var _a;
        return ((_a = process.getuid) === null || _a === void 0 ? void 0 : _a.call(process)) === 0;
      }
      /**
       * Sanitizies the installer path for using with command line tools.
       */
      get installerPath() {
        var _a, _b;
        return (_b = (_a = super.installerPath) === null || _a === void 0 ? void 0 : _a.replace(/\\/g, "\\\\").replace(/ /g, "\\ ")) !== null && _b !== void 0 ? _b : null;
      }
      runCommandWithSudoIfNeeded(commandWithArgs) {
        if (this.isRunningAsRoot()) {
          this._logger.info("Running as root, no need to use sudo");
          return this.spawnSyncLog(commandWithArgs[0], commandWithArgs.slice(1));
        }
        const { name } = this.app;
        const installComment = `"${name} would like to update"`;
        const sudo = this.sudoWithArgs(installComment);
        this._logger.info(`Running as non-root user, using sudo to install: ${sudo}`);
        let wrapper = `"`;
        if (/pkexec/i.test(sudo[0]) || sudo[0] === "sudo") {
          wrapper = "";
        }
        return this.spawnSyncLog(sudo[0], [...sudo.length > 1 ? sudo.slice(1) : [], `${wrapper}/bin/bash`, "-c", `'${commandWithArgs.join(" ")}'${wrapper}`]);
      }
      sudoWithArgs(installComment) {
        const sudo = this.determineSudoCommand();
        const command = [sudo];
        if (/kdesudo/i.test(sudo)) {
          command.push("--comment", installComment);
          command.push("-c");
        } else if (/gksudo/i.test(sudo)) {
          command.push("--message", installComment);
        } else if (/pkexec/i.test(sudo)) {
          command.push("--disable-internal-agent");
        }
        return command;
      }
      hasCommand(cmd) {
        try {
          this.spawnSyncLog(`command`, ["-v", cmd]);
          return true;
        } catch {
          return false;
        }
      }
      determineSudoCommand() {
        const sudos = ["gksudo", "kdesudo", "pkexec", "beesu"];
        for (const sudo of sudos) {
          if (this.hasCommand(sudo)) {
            return sudo;
          }
        }
        return "sudo";
      }
      /**
       * Detects the package manager to use based on the available commands.
       * Allows overriding the default behavior by setting the ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER environment variable.
       * If the environment variable is set, it will be used directly. (This is useful for testing each package manager logic path.)
       * Otherwise, it checks for the presence of the specified package manager commands in the order provided.
       * @param pms - An array of package manager commands to check for, in priority order.
       * @returns The detected package manager command or "unknown" if none are found.
       */
      detectPackageManager(pms) {
        var _a;
        const pmOverride = (_a = process.env.ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER) === null || _a === void 0 ? void 0 : _a.trim();
        if (pmOverride) {
          return pmOverride;
        }
        for (const pm of pms) {
          if (this.hasCommand(pm)) {
            return pm;
          }
        }
        this._logger.warn(`No package manager found in the list: ${pms.join(", ")}. Defaulting to the first one: ${pms[0]}`);
        return pms[0];
      }
    };
    exports2.LinuxUpdater = LinuxUpdater;
  }
});

// node_modules/electron-updater/out/DebUpdater.js
var require_DebUpdater = __commonJS({
  "node_modules/electron-updater/out/DebUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DebUpdater = void 0;
    var Provider_1 = require_Provider();
    var types_1 = require_types();
    var LinuxUpdater_1 = require_LinuxUpdater();
    var DebUpdater = class _DebUpdater extends LinuxUpdater_1.LinuxUpdater {
      constructor(options, app6) {
        super(options, app6);
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "deb", ["AppImage", "rpm", "pacman"]);
        return this.executeDownload({
          fileExtension: "deb",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
              downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
        });
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        if (!this.hasCommand("dpkg") && !this.hasCommand("apt")) {
          this.dispatchError(new Error("Neither dpkg nor apt command found. Cannot install .deb package."));
          return false;
        }
        const priorityList = ["dpkg", "apt"];
        const packageManager = this.detectPackageManager(priorityList);
        try {
          _DebUpdater.installWithCommandRunner(packageManager, installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        } catch (error) {
          this.dispatchError(error);
          return false;
        }
        if (options.isForceRunAfter) {
          this.app.relaunch();
        }
        return true;
      }
      static installWithCommandRunner(packageManager, installerPath, commandRunner, logger) {
        var _a;
        if (packageManager === "dpkg") {
          try {
            commandRunner(["dpkg", "-i", installerPath]);
          } catch (error) {
            logger.warn((_a = error.message) !== null && _a !== void 0 ? _a : error);
            logger.warn("dpkg installation failed, trying to fix broken dependencies with apt-get");
            commandRunner(["apt-get", "install", "-f", "-y"]);
          }
        } else if (packageManager === "apt") {
          logger.warn("Using apt to install a local .deb. This may fail for unsigned packages unless properly configured.");
          commandRunner([
            "apt",
            "install",
            "-y",
            "--allow-unauthenticated",
            // needed for unsigned .debs
            "--allow-downgrades",
            // allow lower version installs
            "--allow-change-held-packages",
            installerPath
          ]);
        } else {
          throw new Error(`Package manager ${packageManager} not supported`);
        }
      }
    };
    exports2.DebUpdater = DebUpdater;
  }
});

// node_modules/electron-updater/out/PacmanUpdater.js
var require_PacmanUpdater = __commonJS({
  "node_modules/electron-updater/out/PacmanUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PacmanUpdater = void 0;
    var types_1 = require_types();
    var Provider_1 = require_Provider();
    var LinuxUpdater_1 = require_LinuxUpdater();
    var PacmanUpdater = class _PacmanUpdater extends LinuxUpdater_1.LinuxUpdater {
      constructor(options, app6) {
        super(options, app6);
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"]);
        return this.executeDownload({
          fileExtension: "pacman",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
              downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
        });
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        try {
          _PacmanUpdater.installWithCommandRunner(installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        } catch (error) {
          this.dispatchError(error);
          return false;
        }
        if (options.isForceRunAfter) {
          this.app.relaunch();
        }
        return true;
      }
      static installWithCommandRunner(installerPath, commandRunner, logger) {
        var _a;
        try {
          commandRunner(["pacman", "-U", "--noconfirm", installerPath]);
        } catch (error) {
          logger.warn((_a = error.message) !== null && _a !== void 0 ? _a : error);
          logger.warn("pacman installation failed, attempting to update package database and retry");
          try {
            commandRunner(["pacman", "-Sy", "--noconfirm"]);
            commandRunner(["pacman", "-U", "--noconfirm", installerPath]);
          } catch (retryError) {
            logger.error("Retry after pacman -Sy failed");
            throw retryError;
          }
        }
      }
    };
    exports2.PacmanUpdater = PacmanUpdater;
  }
});

// node_modules/electron-updater/out/RpmUpdater.js
var require_RpmUpdater = __commonJS({
  "node_modules/electron-updater/out/RpmUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RpmUpdater = void 0;
    var types_1 = require_types();
    var Provider_1 = require_Provider();
    var LinuxUpdater_1 = require_LinuxUpdater();
    var RpmUpdater = class _RpmUpdater extends LinuxUpdater_1.LinuxUpdater {
      constructor(options, app6) {
        super(options, app6);
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "rpm", ["AppImage", "deb", "pacman"]);
        return this.executeDownload({
          fileExtension: "rpm",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
              downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
        });
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        const priorityList = ["zypper", "dnf", "yum", "rpm"];
        const packageManager = this.detectPackageManager(priorityList);
        try {
          _RpmUpdater.installWithCommandRunner(packageManager, installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        } catch (error) {
          this.dispatchError(error);
          return false;
        }
        if (options.isForceRunAfter) {
          this.app.relaunch();
        }
        return true;
      }
      static installWithCommandRunner(packageManager, installerPath, commandRunner, logger) {
        if (packageManager === "zypper") {
          return commandRunner(["zypper", "--non-interactive", "--no-refresh", "install", "--allow-unsigned-rpm", "-f", installerPath]);
        }
        if (packageManager === "dnf") {
          return commandRunner(["dnf", "install", "--nogpgcheck", "-y", installerPath]);
        }
        if (packageManager === "yum") {
          return commandRunner(["yum", "install", "--nogpgcheck", "-y", installerPath]);
        }
        if (packageManager === "rpm") {
          logger.warn("Installing with rpm only (no dependency resolution).");
          return commandRunner(["rpm", "-Uvh", "--replacepkgs", "--replacefiles", "--nodeps", installerPath]);
        }
        throw new Error(`Package manager ${packageManager} not supported`);
      }
    };
    exports2.RpmUpdater = RpmUpdater;
  }
});

// node_modules/electron-updater/out/MacUpdater.js
var require_MacUpdater = __commonJS({
  "node_modules/electron-updater/out/MacUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MacUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var fs_extra_1 = require_lib();
    var fs_1 = require("fs");
    var path16 = require("path");
    var http_1 = require("http");
    var AppUpdater_1 = require_AppUpdater();
    var Provider_1 = require_Provider();
    var child_process_1 = require("child_process");
    var crypto_1 = require("crypto");
    var MacUpdater = class extends AppUpdater_1.AppUpdater {
      constructor(options, app6) {
        super(options, app6);
        this.nativeUpdater = require("electron").autoUpdater;
        this.squirrelDownloadedUpdate = false;
        this.nativeUpdater.on("error", (it) => {
          this._logger.warn(it);
          this.emit("error", it);
        });
        this.nativeUpdater.on("update-downloaded", () => {
          this.squirrelDownloadedUpdate = true;
          this.debug("nativeUpdater.update-downloaded");
        });
      }
      debug(message) {
        if (this._logger.debug != null) {
          this._logger.debug(message);
        }
      }
      closeServerIfExists() {
        if (this.server) {
          this.debug("Closing proxy server");
          this.server.close((err) => {
            if (err) {
              this.debug("proxy server wasn't already open, probably attempted closing again as a safety check before quit");
            }
          });
        }
      }
      async doDownloadUpdate(downloadUpdateOptions) {
        let files = downloadUpdateOptions.updateInfoAndProvider.provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info);
        const log = this._logger;
        const sysctlRosettaInfoKey = "sysctl.proc_translated";
        let isRosetta = false;
        try {
          this.debug("Checking for macOS Rosetta environment");
          const result = (0, child_process_1.execFileSync)("sysctl", [sysctlRosettaInfoKey], { encoding: "utf8" });
          isRosetta = result.includes(`${sysctlRosettaInfoKey}: 1`);
          log.info(`Checked for macOS Rosetta environment (isRosetta=${isRosetta})`);
        } catch (e) {
          log.warn(`sysctl shell command to check for macOS Rosetta environment failed: ${e}`);
        }
        let isArm64Mac = false;
        try {
          this.debug("Checking for arm64 in uname");
          const result = (0, child_process_1.execFileSync)("uname", ["-a"], { encoding: "utf8" });
          const isArm = result.includes("ARM");
          log.info(`Checked 'uname -a': arm64=${isArm}`);
          isArm64Mac = isArm64Mac || isArm;
        } catch (e) {
          log.warn(`uname shell command to check for arm64 failed: ${e}`);
        }
        isArm64Mac = isArm64Mac || process.arch === "arm64" || isRosetta;
        const isArm64 = (file) => {
          var _a;
          return file.url.pathname.includes("arm64") || ((_a = file.info.url) === null || _a === void 0 ? void 0 : _a.includes("arm64"));
        };
        if (isArm64Mac && files.some(isArm64)) {
          files = files.filter((file) => isArm64Mac === isArm64(file));
        } else {
          files = files.filter((file) => !isArm64(file));
        }
        const zipFileInfo = (0, Provider_1.findFile)(files, "zip", ["pkg", "dmg"]);
        if (zipFileInfo == null) {
          throw (0, builder_util_runtime_1.newError)(`ZIP file not provided: ${(0, builder_util_runtime_1.safeStringifyJson)(files)}`, "ERR_UPDATER_ZIP_FILE_NOT_FOUND");
        }
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const CURRENT_MAC_APP_ZIP_FILE_NAME = "update.zip";
        return this.executeDownload({
          fileExtension: "zip",
          fileInfo: zipFileInfo,
          downloadUpdateOptions,
          task: async (destinationFile, downloadOptions) => {
            const cachedUpdateFilePath = path16.join(this.downloadedUpdateHelper.cacheDir, CURRENT_MAC_APP_ZIP_FILE_NAME);
            const canDifferentialDownload = () => {
              if (!(0, fs_extra_1.pathExistsSync)(cachedUpdateFilePath)) {
                log.info("Unable to locate previous update.zip for differential download (is this first install?), falling back to full download");
                return false;
              }
              return !downloadUpdateOptions.disableDifferentialDownload;
            };
            let differentialDownloadFailed = true;
            if (canDifferentialDownload()) {
              differentialDownloadFailed = await this.differentialDownloadInstaller(zipFileInfo, downloadUpdateOptions, destinationFile, provider, CURRENT_MAC_APP_ZIP_FILE_NAME);
            }
            if (differentialDownloadFailed) {
              await this.httpExecutor.download(zipFileInfo.url, destinationFile, downloadOptions);
            }
          },
          done: async (event) => {
            if (!downloadUpdateOptions.disableDifferentialDownload) {
              try {
                const cachedUpdateFilePath = path16.join(this.downloadedUpdateHelper.cacheDir, CURRENT_MAC_APP_ZIP_FILE_NAME);
                await (0, fs_extra_1.copyFile)(event.downloadedFile, cachedUpdateFilePath);
              } catch (error) {
                this._logger.warn(`Unable to copy file for caching for future differential downloads: ${error.message}`);
              }
            }
            return this.updateDownloaded(zipFileInfo, event);
          }
        });
      }
      async updateDownloaded(zipFileInfo, event) {
        var _a;
        const downloadedFile = event.downloadedFile;
        const updateFileSize = (_a = zipFileInfo.info.size) !== null && _a !== void 0 ? _a : (await (0, fs_extra_1.stat)(downloadedFile)).size;
        const log = this._logger;
        const logContext = `fileToProxy=${zipFileInfo.url.href}`;
        this.closeServerIfExists();
        this.debug(`Creating proxy server for native Squirrel.Mac (${logContext})`);
        this.server = (0, http_1.createServer)();
        this.debug(`Proxy server for native Squirrel.Mac is created (${logContext})`);
        this.server.on("close", () => {
          log.info(`Proxy server for native Squirrel.Mac is closed (${logContext})`);
        });
        const getServerUrl = (s) => {
          const address = s.address();
          if (typeof address === "string") {
            return address;
          }
          return `http://127.0.0.1:${address === null || address === void 0 ? void 0 : address.port}`;
        };
        return await new Promise((resolve5, reject) => {
          const pass = (0, crypto_1.randomBytes)(64).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
          const authInfo = Buffer.from(`autoupdater:${pass}`, "ascii");
          const fileUrl = `/${(0, crypto_1.randomBytes)(64).toString("hex")}.zip`;
          this.server.on("request", (request, response) => {
            const requestUrl = request.url;
            log.info(`${requestUrl} requested`);
            if (requestUrl === "/") {
              if (!request.headers.authorization || request.headers.authorization.indexOf("Basic ") === -1) {
                response.statusCode = 401;
                response.statusMessage = "Invalid Authentication Credentials";
                response.end();
                log.warn("No authenthication info");
                return;
              }
              const base64Credentials = request.headers.authorization.split(" ")[1];
              const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
              const [username, password] = credentials.split(":");
              if (username !== "autoupdater" || password !== pass) {
                response.statusCode = 401;
                response.statusMessage = "Invalid Authentication Credentials";
                response.end();
                log.warn("Invalid authenthication credentials");
                return;
              }
              const data = Buffer.from(`{ "url": "${getServerUrl(this.server)}${fileUrl}" }`);
              response.writeHead(200, { "Content-Type": "application/json", "Content-Length": data.length });
              response.end(data);
              return;
            }
            if (!requestUrl.startsWith(fileUrl)) {
              log.warn(`${requestUrl} requested, but not supported`);
              response.writeHead(404);
              response.end();
              return;
            }
            log.info(`${fileUrl} requested by Squirrel.Mac, pipe ${downloadedFile}`);
            let errorOccurred = false;
            response.on("finish", () => {
              if (!errorOccurred) {
                this.nativeUpdater.removeListener("error", reject);
                resolve5([]);
              }
            });
            const readStream = (0, fs_1.createReadStream)(downloadedFile);
            readStream.on("error", (error) => {
              try {
                response.end();
              } catch (e) {
                log.warn(`cannot end response: ${e}`);
              }
              errorOccurred = true;
              this.nativeUpdater.removeListener("error", reject);
              reject(new Error(`Cannot pipe "${downloadedFile}": ${error}`));
            });
            response.writeHead(200, {
              "Content-Type": "application/zip",
              "Content-Length": updateFileSize
            });
            readStream.pipe(response);
          });
          this.debug(`Proxy server for native Squirrel.Mac is starting to listen (${logContext})`);
          this.server.listen(0, "127.0.0.1", () => {
            this.debug(`Proxy server for native Squirrel.Mac is listening (address=${getServerUrl(this.server)}, ${logContext})`);
            this.nativeUpdater.setFeedURL({
              url: getServerUrl(this.server),
              headers: {
                "Cache-Control": "no-cache",
                Authorization: `Basic ${authInfo.toString("base64")}`
              }
            });
            this.dispatchUpdateDownloaded(event);
            if (this.autoInstallOnAppQuit) {
              this.nativeUpdater.once("error", reject);
              this.nativeUpdater.checkForUpdates();
            } else {
              resolve5([]);
            }
          });
        });
      }
      handleUpdateDownloaded() {
        if (this.autoRunAppAfterInstall) {
          this.nativeUpdater.quitAndInstall();
        } else {
          this.app.quit();
        }
        this.closeServerIfExists();
      }
      quitAndInstall() {
        if (this.squirrelDownloadedUpdate) {
          this.handleUpdateDownloaded();
        } else {
          this.nativeUpdater.on("update-downloaded", () => this.handleUpdateDownloaded());
          if (!this.autoInstallOnAppQuit) {
            this.nativeUpdater.checkForUpdates();
          }
        }
      }
    };
    exports2.MacUpdater = MacUpdater;
  }
});

// node_modules/electron-updater/out/windowsExecutableCodeSignatureVerifier.js
var require_windowsExecutableCodeSignatureVerifier = __commonJS({
  "node_modules/electron-updater/out/windowsExecutableCodeSignatureVerifier.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.verifySignature = verifySignature;
    var builder_util_runtime_1 = require_out();
    var child_process_1 = require("child_process");
    var os7 = require("os");
    var path16 = require("path");
    function preparePowerShellExec(command, timeout) {
      const executable = `set "PSModulePath=" & chcp 65001 >NUL & powershell.exe`;
      const args = ["-NoProfile", "-NonInteractive", "-InputFormat", "None", "-Command", command];
      const options = {
        shell: true,
        timeout
      };
      return [executable, args, options];
    }
    function verifySignature(publisherNames, unescapedTempUpdateFile, logger) {
      return new Promise((resolve5, reject) => {
        const tempUpdateFile = unescapedTempUpdateFile.replace(/'/g, "''");
        logger.info(`Verifying signature ${tempUpdateFile}`);
        (0, child_process_1.execFile)(...preparePowerShellExec(`"Get-AuthenticodeSignature -LiteralPath '${tempUpdateFile}' | ConvertTo-Json -Compress"`, 20 * 1e3), (error, stdout, stderr) => {
          var _a;
          try {
            if (error != null || stderr) {
              handleError(logger, error, stderr, reject);
              resolve5(null);
              return;
            }
            const data = parseOut(stdout);
            if (data.Status === 0) {
              try {
                const normlaizedUpdateFilePath = path16.normalize(data.Path);
                const normalizedTempUpdateFile = path16.normalize(unescapedTempUpdateFile);
                logger.info(`LiteralPath: ${normlaizedUpdateFilePath}. Update Path: ${normalizedTempUpdateFile}`);
                if (normlaizedUpdateFilePath !== normalizedTempUpdateFile) {
                  handleError(logger, new Error(`LiteralPath of ${normlaizedUpdateFilePath} is different than ${normalizedTempUpdateFile}`), stderr, reject);
                  resolve5(null);
                  return;
                }
              } catch (error2) {
                logger.warn(`Unable to verify LiteralPath of update asset due to missing data.Path. Skipping this step of validation. Message: ${(_a = error2.message) !== null && _a !== void 0 ? _a : error2.stack}`);
              }
              const subject = (0, builder_util_runtime_1.parseDn)(data.SignerCertificate.Subject);
              let match = false;
              for (const name of publisherNames) {
                const dn = (0, builder_util_runtime_1.parseDn)(name);
                if (dn.size) {
                  const allKeys = Array.from(dn.keys());
                  match = allKeys.every((key) => {
                    return dn.get(key) === subject.get(key);
                  });
                } else if (name === subject.get("CN")) {
                  logger.warn(`Signature validated using only CN ${name}. Please add your full Distinguished Name (DN) to publisherNames configuration`);
                  match = true;
                }
                if (match) {
                  resolve5(null);
                  return;
                }
              }
            }
            const result = `publisherNames: ${publisherNames.join(" | ")}, raw info: ` + JSON.stringify(data, (name, value) => name === "RawData" ? void 0 : value, 2);
            logger.warn(`Sign verification failed, installer signed with incorrect certificate: ${result}`);
            resolve5(result);
          } catch (e) {
            handleError(logger, e, null, reject);
            resolve5(null);
            return;
          }
        });
      });
    }
    function parseOut(out) {
      const data = JSON.parse(out);
      delete data.PrivateKey;
      delete data.IsOSBinary;
      delete data.SignatureType;
      const signerCertificate = data.SignerCertificate;
      if (signerCertificate != null) {
        delete signerCertificate.Archived;
        delete signerCertificate.Extensions;
        delete signerCertificate.Handle;
        delete signerCertificate.HasPrivateKey;
        delete signerCertificate.SubjectName;
      }
      return data;
    }
    function handleError(logger, error, stderr, reject) {
      if (isOldWin6()) {
        logger.warn(`Cannot execute Get-AuthenticodeSignature: ${error || stderr}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
        return;
      }
      try {
        (0, child_process_1.execFileSync)(...preparePowerShellExec("ConvertTo-Json test", 10 * 1e3));
      } catch (testError) {
        logger.warn(`Cannot execute ConvertTo-Json: ${testError.message}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
        return;
      }
      if (error != null) {
        reject(error);
      }
      if (stderr) {
        reject(new Error(`Cannot execute Get-AuthenticodeSignature, stderr: ${stderr}. Failing signature validation due to unknown stderr.`));
      }
    }
    function isOldWin6() {
      const winVersion = os7.release();
      return winVersion.startsWith("6.") && !winVersion.startsWith("6.3");
    }
  }
});

// node_modules/electron-updater/out/NsisUpdater.js
var require_NsisUpdater = __commonJS({
  "node_modules/electron-updater/out/NsisUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NsisUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var path16 = require("path");
    var BaseUpdater_1 = require_BaseUpdater();
    var FileWithEmbeddedBlockMapDifferentialDownloader_1 = require_FileWithEmbeddedBlockMapDifferentialDownloader();
    var types_1 = require_types();
    var Provider_1 = require_Provider();
    var fs_extra_1 = require_lib();
    var windowsExecutableCodeSignatureVerifier_1 = require_windowsExecutableCodeSignatureVerifier();
    var url_1 = require("url");
    var NsisUpdater = class extends BaseUpdater_1.BaseUpdater {
      constructor(options, app6) {
        super(options, app6);
        this._verifyUpdateCodeSignature = (publisherNames, unescapedTempUpdateFile) => (0, windowsExecutableCodeSignatureVerifier_1.verifySignature)(publisherNames, unescapedTempUpdateFile, this._logger);
      }
      /**
       * The verifyUpdateCodeSignature. You can pass [win-verify-signature](https://github.com/beyondkmp/win-verify-trust) or another custom verify function: ` (publisherName: string[], path: string) => Promise<string | null>`.
       * The default verify function uses [windowsExecutableCodeSignatureVerifier](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/windowsExecutableCodeSignatureVerifier.ts)
       */
      get verifyUpdateCodeSignature() {
        return this._verifyUpdateCodeSignature;
      }
      set verifyUpdateCodeSignature(value) {
        if (value) {
          this._verifyUpdateCodeSignature = value;
        }
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "exe");
        return this.executeDownload({
          fileExtension: "exe",
          downloadUpdateOptions,
          fileInfo,
          task: async (destinationFile, downloadOptions, packageFile, removeTempDirIfAny) => {
            const packageInfo = fileInfo.packageInfo;
            const isWebInstaller = packageInfo != null && packageFile != null;
            if (isWebInstaller && downloadUpdateOptions.disableWebInstaller) {
              throw (0, builder_util_runtime_1.newError)(`Unable to download new version ${downloadUpdateOptions.updateInfoAndProvider.info.version}. Web Installers are disabled`, "ERR_UPDATER_WEB_INSTALLER_DISABLED");
            }
            if (!isWebInstaller && !downloadUpdateOptions.disableWebInstaller) {
              this._logger.warn("disableWebInstaller is set to false, you should set it to true if you do not plan on using a web installer. This will default to true in a future version.");
            }
            if (isWebInstaller || downloadUpdateOptions.disableDifferentialDownload || await this.differentialDownloadInstaller(fileInfo, downloadUpdateOptions, destinationFile, provider, builder_util_runtime_1.CURRENT_APP_INSTALLER_FILE_NAME)) {
              await this.httpExecutor.download(fileInfo.url, destinationFile, downloadOptions);
            }
            const signatureVerificationStatus = await this.verifySignature(destinationFile);
            if (signatureVerificationStatus != null) {
              await removeTempDirIfAny();
              throw (0, builder_util_runtime_1.newError)(`New version ${downloadUpdateOptions.updateInfoAndProvider.info.version} is not signed by the application owner: ${signatureVerificationStatus}`, "ERR_UPDATER_INVALID_SIGNATURE");
            }
            if (isWebInstaller) {
              if (await this.differentialDownloadWebPackage(downloadUpdateOptions, packageInfo, packageFile, provider)) {
                try {
                  await this.httpExecutor.download(new url_1.URL(packageInfo.path), packageFile, {
                    headers: downloadUpdateOptions.requestHeaders,
                    cancellationToken: downloadUpdateOptions.cancellationToken,
                    sha512: packageInfo.sha512
                  });
                } catch (e) {
                  try {
                    await (0, fs_extra_1.unlink)(packageFile);
                  } catch (_ignored) {
                  }
                  throw e;
                }
              }
            }
          }
        });
      }
      // $certificateInfo = (Get-AuthenticodeSignature 'xxx\yyy.exe'
      // | where {$_.Status.Equals([System.Management.Automation.SignatureStatus]::Valid) -and $_.SignerCertificate.Subject.Contains("CN=siemens.com")})
      // | Out-String ; if ($certificateInfo) { exit 0 } else { exit 1 }
      async verifySignature(tempUpdateFile) {
        let publisherName;
        try {
          publisherName = (await this.configOnDisk.value).publisherName;
          if (publisherName == null) {
            return null;
          }
        } catch (e) {
          if (e.code === "ENOENT") {
            return null;
          }
          throw e;
        }
        return await this._verifyUpdateCodeSignature(Array.isArray(publisherName) ? publisherName : [publisherName], tempUpdateFile);
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        const args = ["--updated"];
        if (options.isSilent) {
          args.push("/S");
        }
        if (options.isForceRunAfter) {
          args.push("--force-run");
        }
        if (this.installDirectory) {
          args.push(`/D=${this.installDirectory}`);
        }
        const packagePath = this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.packageFile;
        if (packagePath != null) {
          args.push(`--package-file=${packagePath}`);
        }
        const callUsingElevation = () => {
          this.spawnLog(path16.join(process.resourcesPath, "elevate.exe"), [installerPath].concat(args)).catch((e) => this.dispatchError(e));
        };
        if (options.isAdminRightsRequired) {
          this._logger.info("isAdminRightsRequired is set to true, run installer using elevate.exe");
          callUsingElevation();
          return true;
        }
        this.spawnLog(installerPath, args).catch((e) => {
          const errorCode = e.code;
          this._logger.info(`Cannot run installer: error code: ${errorCode}, error message: "${e.message}", will be executed again using elevate if EACCES, and will try to use electron.shell.openItem if ENOENT`);
          if (errorCode === "UNKNOWN" || errorCode === "EACCES") {
            callUsingElevation();
          } else if (errorCode === "ENOENT") {
            require("electron").shell.openPath(installerPath).catch((err) => this.dispatchError(err));
          } else {
            this.dispatchError(e);
          }
        });
        return true;
      }
      async differentialDownloadWebPackage(downloadUpdateOptions, packageInfo, packagePath, provider) {
        if (packageInfo.blockMapSize == null) {
          return true;
        }
        try {
          const downloadOptions = {
            newUrl: new url_1.URL(packageInfo.path),
            oldFile: path16.join(this.downloadedUpdateHelper.cacheDir, builder_util_runtime_1.CURRENT_APP_PACKAGE_FILE_NAME),
            logger: this._logger,
            newFile: packagePath,
            requestHeaders: this.requestHeaders,
            isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
            cancellationToken: downloadUpdateOptions.cancellationToken
          };
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await new FileWithEmbeddedBlockMapDifferentialDownloader_1.FileWithEmbeddedBlockMapDifferentialDownloader(packageInfo, this.httpExecutor, downloadOptions).download();
        } catch (e) {
          this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
          return process.platform === "win32";
        }
        return false;
      }
    };
    exports2.NsisUpdater = NsisUpdater;
  }
});

// node_modules/electron-updater/out/main.js
var require_main2 = __commonJS({
  "node_modules/electron-updater/out/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NsisUpdater = exports2.MacUpdater = exports2.RpmUpdater = exports2.PacmanUpdater = exports2.DebUpdater = exports2.AppImageUpdater = exports2.Provider = exports2.NoOpLogger = exports2.AppUpdater = exports2.BaseUpdater = void 0;
    var fs_extra_1 = require_lib();
    var path16 = require("path");
    var BaseUpdater_1 = require_BaseUpdater();
    Object.defineProperty(exports2, "BaseUpdater", { enumerable: true, get: function() {
      return BaseUpdater_1.BaseUpdater;
    } });
    var AppUpdater_1 = require_AppUpdater();
    Object.defineProperty(exports2, "AppUpdater", { enumerable: true, get: function() {
      return AppUpdater_1.AppUpdater;
    } });
    Object.defineProperty(exports2, "NoOpLogger", { enumerable: true, get: function() {
      return AppUpdater_1.NoOpLogger;
    } });
    var Provider_1 = require_Provider();
    Object.defineProperty(exports2, "Provider", { enumerable: true, get: function() {
      return Provider_1.Provider;
    } });
    var AppImageUpdater_1 = require_AppImageUpdater();
    Object.defineProperty(exports2, "AppImageUpdater", { enumerable: true, get: function() {
      return AppImageUpdater_1.AppImageUpdater;
    } });
    var DebUpdater_1 = require_DebUpdater();
    Object.defineProperty(exports2, "DebUpdater", { enumerable: true, get: function() {
      return DebUpdater_1.DebUpdater;
    } });
    var PacmanUpdater_1 = require_PacmanUpdater();
    Object.defineProperty(exports2, "PacmanUpdater", { enumerable: true, get: function() {
      return PacmanUpdater_1.PacmanUpdater;
    } });
    var RpmUpdater_1 = require_RpmUpdater();
    Object.defineProperty(exports2, "RpmUpdater", { enumerable: true, get: function() {
      return RpmUpdater_1.RpmUpdater;
    } });
    var MacUpdater_1 = require_MacUpdater();
    Object.defineProperty(exports2, "MacUpdater", { enumerable: true, get: function() {
      return MacUpdater_1.MacUpdater;
    } });
    var NsisUpdater_1 = require_NsisUpdater();
    Object.defineProperty(exports2, "NsisUpdater", { enumerable: true, get: function() {
      return NsisUpdater_1.NsisUpdater;
    } });
    __exportStar(require_types(), exports2);
    var _autoUpdater;
    function doLoadAutoUpdater() {
      if (process.platform === "win32") {
        _autoUpdater = new (require_NsisUpdater()).NsisUpdater();
      } else if (process.platform === "darwin") {
        _autoUpdater = new (require_MacUpdater()).MacUpdater();
      } else {
        _autoUpdater = new (require_AppImageUpdater()).AppImageUpdater();
        try {
          const identity = path16.join(process.resourcesPath, "package-type");
          if (!(0, fs_extra_1.existsSync)(identity)) {
            return _autoUpdater;
          }
          const fileType = (0, fs_extra_1.readFileSync)(identity).toString().trim();
          switch (fileType) {
            case "deb":
              _autoUpdater = new (require_DebUpdater()).DebUpdater();
              break;
            case "rpm":
              _autoUpdater = new (require_RpmUpdater()).RpmUpdater();
              break;
            case "pacman":
              _autoUpdater = new (require_PacmanUpdater()).PacmanUpdater();
              break;
            default:
              break;
          }
        } catch (error) {
          console.warn("Unable to detect 'package-type' for autoUpdater (rpm/deb/pacman support). If you'd like to expand support, please consider contributing to electron-builder", error.message);
        }
      }
      return _autoUpdater;
    }
    Object.defineProperty(exports2, "autoUpdater", {
      enumerable: true,
      get: () => {
        return _autoUpdater || doLoadAutoUpdater();
      }
    });
  }
});

// src/main.ts
var path15 = __toESM(require("path"));
var os6 = __toESM(require("os"));
var import_electron16 = require("electron");

// src/constants.ts
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var MYOPENCLAW_DATA_DIR = path.join(os.homedir(), ".myopenclaw");
var OPENCLAW_CONFIG_DIR = path.join(MYOPENCLAW_DATA_DIR, "openclaw");
var CONFIG_FILE = path.join(OPENCLAW_CONFIG_DIR, "openclaw.json");
var MANAGED_TOOLS_DIR = path.join(MYOPENCLAW_DATA_DIR, "tools");
var DEFAULT_PORT = 18800;
var EMBEDDED_CONFIG_FILE = path.join(MYOPENCLAW_DATA_DIR, "embedded-config.json");
var APP_STATE_FILE = path.join(MYOPENCLAW_DATA_DIR, "app-state.json");
var AUTH_PROFILES_DIR = path.join(OPENCLAW_CONFIG_DIR, "agents", "main", "agent");
var AUTH_PROFILES_FILE = path.join(AUTH_PROFILES_DIR, "auth-profiles.json");
var DOWNLOADED_RUNTIME_DIR = path.join(MYOPENCLAW_DATA_DIR, "runtime");
var RELAY_BASE_URL = "https://relay.myopenclaws.app";
var PROTOCOL = "myopenclaw";
var MIN_NODE_MAJOR_VERSION = 22;
var GATEWAY_WORKSPACE_DIR = path.join(OPENCLAW_CONFIG_DIR, "workspace");
var SYSTEM_SOUL = `## System Rules

myopenclaw employs active moderation filters to block nsfw content. users attempting to bypass these filters will be banned immediately without refund. any violation of this aup will result in account termination.`;

// src/config-store.ts
var crypto = __toESM(require("crypto"));
var path2 = __toESM(require("path"));
var fs = __toESM(require("fs"));
function readGatewayTokenFromConfig() {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return "";
    const config = JSON.parse(fs.readFileSync(EMBEDDED_CONFIG_FILE, "utf8").replace(/^\uFEFF/, ""));
    return String(config?.gateway?.auth?.token || "").trim();
  } catch {
    return "";
  }
}
function ensureRandomGatewayToken() {
  const cfg = loadEmbeddedConfig();
  cfg.gateway = cfg.gateway || {};
  cfg.gateway.auth = cfg.gateway.auth || {};
  if (!cfg.gateway.auth.token || cfg.gateway.auth.token === "myopenclaw_2024_secure_token_a8f3e9d2c1b7f6e5d4c3b2a1") {
    cfg.gateway.auth.token = crypto.randomUUID();
    cfg.gateway.auth.mode = "token";
  }
  cfg.gateway.http = cfg.gateway.http || {};
  cfg.gateway.http.endpoints = cfg.gateway.http.endpoints || {};
  cfg.gateway.http.endpoints.chatCompletions = { enabled: true };
  saveEmbeddedConfig(cfg);
  return cfg.gateway.auth.token;
}
function buildDashboardUrl(baseUrl, gatewayBaseUrl) {
  const token = readGatewayTokenFromConfig();
  const u = new URL(baseUrl || gatewayBaseUrl || `http://127.0.0.1:${DEFAULT_PORT}`);
  if (token) {
    u.searchParams.set("gatewayToken", token);
    u.searchParams.set("token", token);
    u.searchParams.set("x-api-key", token);
  }
  return u.toString();
}
function getDefaultAppState() {
  return {
    premiumTier: "free",
    isPremium: false,
    plan: "free",
    planExpiresAt: null,
    freeQuotaUsed: 0,
    userApiKey: "",
    userApiKeyQuotaUsed: 0,
    activeAgentId: "main",
    agents: [
      {
        id: "main",
        name: "Main Agent",
        channels: []
      }
    ],
    conversations: {},
    relay: { baseUrl: "", authToken: "", accessToken: "", refreshToken: "", userEmail: "" },
    deviceId: "",
    deviceToken: "",
    updateChannel: "stable"
  };
}
function normalizePlan(plan) {
  if (plan === "pro") return "pro";
  if (plan === "premium" || plan === "plus") return "premium";
  return "free";
}
function applyPlanToState(state, plan, planExpiresAt) {
  const normalized = normalizePlan(plan);
  state.premiumTier = normalized;
  state.isPremium = normalized !== "free";
  state.plan = normalized;
  if (planExpiresAt !== void 0) state.planExpiresAt = planExpiresAt;
  return normalized;
}
function getPlanFeatures(plan) {
  const features = {
    free: { maxAgents: 1, canUseRelay: true, modelTier: "basic" },
    plus: { maxAgents: 3, canUseRelay: true, modelTier: "major" },
    premium: { maxAgents: 3, canUseRelay: true, modelTier: "major" },
    // legacy alias
    pro: { maxAgents: 10, canUseRelay: true, modelTier: "latest" }
  };
  return features[plan] || features.free;
}
function loadAppState() {
  try {
    if (!fs.existsSync(APP_STATE_FILE)) {
      saveAppState(getDefaultAppState());
      return getDefaultAppState();
    }
    const state = { ...getDefaultAppState(), ...JSON.parse(fs.readFileSync(APP_STATE_FILE, "utf8")) };
    applyPlanToState(state, state.plan || state.premiumTier || (state.isPremium ? "premium" : "free"));
    return state;
  } catch (error) {
    console.error("[app-state] load failed, using default:", error.message);
    return getDefaultAppState();
  }
}
function saveAppState(state) {
  const dir = path2.dirname(APP_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}
function checkPremiumGate(state) {
  if (state.premiumTier === "premium" || state.premiumTier === "pro") {
    return { allow: true, tier: state.premiumTier };
  }
  const relay = state.relay || { baseUrl: "", authToken: "", accessToken: "", refreshToken: "", userEmail: "" };
  const hasRelay = !!(relay.accessToken || relay.authToken);
  if (hasRelay) {
    return { allow: true, tier: "free" };
  }
  if (state.userApiKey) {
    return { allow: true, tier: "user_api_key" };
  }
  if (state.deviceId) {
    return { allow: true, tier: "anonymous" };
  }
  return {
    allow: false,
    reason: "login_required",
    message: "You've used your free credits. Sign in to continue chatting.",
    loginRequired: true
  };
}
function consumeQuota(state, tier) {
  if (tier === "free" || tier === "anonymous") state.freeQuotaUsed += 1;
  if (tier === "user_api_key") state.userApiKeyQuotaUsed += 1;
}
function loadEmbeddedConfig() {
  try {
    if (!fs.existsSync(EMBEDDED_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(EMBEDDED_CONFIG_FILE, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[embedded-config] load failed:", e.message);
    return {};
  }
}
function saveEmbeddedConfig(config) {
  const dir = path2.dirname(EMBEDDED_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDED_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}
function getUserProviderConfig() {
  const cfg = loadEmbeddedConfig();
  const providers = cfg?.models?.providers || {};
  for (const [providerId, p] of Object.entries(providers)) {
    const apiKey = String(p?.apiKey || "").trim();
    if (apiKey) {
      return {
        providerId,
        baseUrl: String(p?.baseUrl || "").trim(),
        apiKey,
        modelId: p?.models?.[0]?.id || "default",
        api: p?.api || "openai-completions"
      };
    }
  }
  return null;
}

// src/device.ts
var crypto2 = __toESM(require("crypto"));
var import_child_process = require("child_process");
var import_axios = __toESM(require("axios"));

// src/network-diagnostics.ts
var import_dns = require("dns");
var DNS_ERROR_CODES = /* @__PURE__ */ new Set(["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL", "ENODATA"]);
var DNS_PROBE_TIMEOUT_MS = 2e3;
function withTimeout(promise, timeoutMs) {
  return new Promise((resolve5, reject) => {
    const timer = setTimeout(() => reject(new Error(`DNS probe timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve5(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
function summarizeProxyEnv(value) {
  const raw = String(value || "").trim();
  if (!raw) return void 0;
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return "<set>";
  }
}
function getRequestMeta(requestUrl) {
  const raw = String(requestUrl || "").trim();
  if (!raw) return {};
  try {
    const parsed = new URL(raw);
    return {
      hostname: parsed.hostname,
      origin: parsed.origin,
      pathname: parsed.pathname
    };
  } catch {
    return {};
  }
}
function isDnsResolutionError(error) {
  const code = String(error?.code || error?.cause?.code || "").toUpperCase();
  const message = String(error?.message || "");
  return DNS_ERROR_CODES.has(code) || /ENOTFOUND|EAI_AGAIN|EAI_FAIL|getaddrinfo/i.test(message);
}
async function logDnsDiagnostics(context, error, requestUrl) {
  if (!isDnsResolutionError(error)) return;
  const meta = getRequestMeta(requestUrl || error?.config?.url);
  const diagnostics = {
    context,
    code: error?.code || error?.cause?.code || null,
    errno: error?.errno || error?.cause?.errno || null,
    syscall: error?.syscall || error?.cause?.syscall || null,
    message: error?.message || String(error),
    hostname: meta.hostname || null,
    requestOrigin: meta.origin || null,
    requestPath: meta.pathname || null,
    dnsServers: (0, import_dns.getServers)(),
    proxy: {
      http: summarizeProxyEnv(process.env.HTTP_PROXY || process.env.http_proxy),
      https: summarizeProxyEnv(process.env.HTTPS_PROXY || process.env.https_proxy),
      all: summarizeProxyEnv(process.env.ALL_PROXY || process.env.all_proxy),
      noProxy: process.env.NO_PROXY || process.env.no_proxy || ""
    }
  };
  if (meta.hostname) {
    const startedAt = Date.now();
    try {
      const addresses = await withTimeout(
        import_dns.promises.lookup(meta.hostname, { all: true, verbatim: true }),
        DNS_PROBE_TIMEOUT_MS
      );
      diagnostics.probe = {
        ok: true,
        elapsedMs: Date.now() - startedAt,
        addresses: addresses.map((entry) => `${entry.address}/${entry.family}`)
      };
    } catch (probeError) {
      diagnostics.probe = {
        ok: false,
        elapsedMs: Date.now() - startedAt,
        code: probeError?.code || null,
        message: probeError?.message || String(probeError)
      };
    }
  }
  console.error("[dns] Resolution diagnostics:", JSON.stringify(diagnostics));
}

// src/device.ts
function getMachineId() {
  try {
    if (process.platform === "darwin") {
      const output = (0, import_child_process.execSync)(
        "ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID",
        { encoding: "utf8", timeout: 5e3 }
      );
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      return match?.[1] || null;
    }
    if (process.platform === "win32") {
      const output = (0, import_child_process.execSync)("wmic csproduct get uuid", {
        encoding: "utf8",
        timeout: 5e3
      });
      const lines = output.trim().split("\n");
      const uuid = lines[1]?.trim();
      return uuid && uuid !== "" ? uuid : null;
    }
    return null;
  } catch {
    return null;
  }
}
function deriveDeviceId(machineId) {
  const hash = crypto2.createHash("sha256").update(`myopenclaw:${machineId}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join("-");
}
function ensureDeviceId() {
  const state = loadAppState();
  if (!state.deviceId) {
    const machineId = getMachineId();
    if (machineId) {
      state.deviceId = deriveDeviceId(machineId);
      console.log("[device-id] Derived device ID from machine hardware");
    } else {
      state.deviceId = crypto2.randomUUID();
      console.log("[device-id] Generated random device ID (hardware ID unavailable)");
    }
    saveAppState(state);
  } else {
    console.log("[device-id] Loaded existing device ID:", state.deviceId);
  }
  return state.deviceId;
}
async function registerDevice(deviceId, appVersion) {
  const requestUrl = `${RELAY_BASE_URL}/v1/devices`;
  try {
    const response = await import_axios.default.post(requestUrl, {
      deviceId,
      platform: process.platform,
      appVersion
    }, { timeout: 2e4 });
    console.log("[device-registration] Device registered successfully");
    const deviceToken = response.data?.deviceToken;
    if (deviceToken) {
      const state = loadAppState();
      state.deviceToken = deviceToken;
      saveAppState(state);
      console.log("[device-registration] Saved signed device token");
    }
  } catch (err) {
    await logDnsDiagnostics("device-registration", err, requestUrl);
    console.log("[device-registration] Registration failed (non-fatal):", err.message);
  }
}

// src/deep-link.ts
var import_axios3 = __toESM(require("axios"));

// src/auth.ts
var fs2 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var import_axios2 = __toESM(require("axios"));
function syncAuthProfileForProvider(providerId, apiKey, api = "") {
  try {
    const key = String(apiKey || "").trim();
    if (!providerId || !key) return;
    const buildAuthPayload = () => {
      let auth2 = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
      if (fs2.existsSync(AUTH_PROFILES_FILE)) {
        auth2 = JSON.parse(fs2.readFileSync(AUTH_PROFILES_FILE, "utf8").replace(/^\uFEFF/, ""));
        auth2.version = auth2.version || 1;
        auth2.profiles = auth2.profiles || {};
        auth2.lastGood = auth2.lastGood || {};
        auth2.usageStats = auth2.usageStats || {};
      }
      const bind = (pid) => {
        const profileId = `${pid}:default`;
        auth2.profiles[profileId] = { type: "api_key", provider: pid, key };
        auth2.lastGood[pid] = profileId;
      };
      bind(providerId);
      if (String(api).trim() === "anthropic-messages") bind("anthropic");
      return auth2;
    };
    const auth = buildAuthPayload();
    const newContent = JSON.stringify(auth, null, 2);
    for (const agentId of getAllAgentIds()) {
      const agentDir = path3.join(OPENCLAW_CONFIG_DIR, "agents", agentId, "agent");
      const profileFile = path3.join(agentDir, "auth-profiles.json");
      fs2.mkdirSync(agentDir, { recursive: true });
      const oldContent = fs2.existsSync(profileFile) ? fs2.readFileSync(profileFile, "utf8") : "";
      if (newContent !== oldContent) {
        fs2.writeFileSync(profileFile, newContent, "utf8");
      }
    }
  } catch (e) {
    console.error("[auth-profile-sync] failed:", e.message);
  }
}
function ensureAuthProfilesFromEmbeddedConfig() {
  try {
    const cfg = loadEmbeddedConfig();
    const providers = cfg?.models?.providers || {};
    for (const [providerId, p] of Object.entries(providers)) {
      const key = String(p?.apiKey || "").trim();
      if (!key) continue;
      syncAuthProfileForProvider(providerId, key, p?.api || "");
      syncAgentModelRegistries();
      break;
    }
  } catch (e) {
    console.error("[auth-profile-sync-bootstrap] failed:", e.message);
  }
}
function buildRelayRuntimeApiKey(explicitRelayApiKey) {
  const state = loadAppState();
  const jwt = String(explicitRelayApiKey || state.relay?.accessToken || "").trim();
  if (jwt) return jwt;
  const deviceToken = String(state.deviceToken || "").trim();
  if (deviceToken) return deviceToken;
  const deviceId = String(state.deviceId || "").trim();
  if (deviceId) return `device:${deviceId}`;
  return "";
}
function buildAgentModelsPayload(explicitRelayApiKey) {
  const gatewayCfg = fs2.existsSync(CONFIG_FILE) ? JSON.parse(fs2.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
  const embeddedCfg = loadEmbeddedConfig();
  const mergedProviders = {};
  for (const [providerId, provider] of Object.entries(gatewayCfg?.models?.providers || {})) {
    mergedProviders[providerId] = JSON.parse(JSON.stringify(provider));
  }
  for (const [providerId, provider] of Object.entries(embeddedCfg?.models?.providers || {})) {
    mergedProviders[providerId] = {
      ...mergedProviders[providerId] || {},
      ...JSON.parse(JSON.stringify(provider))
    };
  }
  const relayApiKey = buildRelayRuntimeApiKey(explicitRelayApiKey);
  if (mergedProviders.relay) {
    if (relayApiKey) {
      mergedProviders.relay.apiKey = relayApiKey;
    } else if (mergedProviders.relay.apiKey !== void 0) {
      delete mergedProviders.relay.apiKey;
    }
  }
  return {
    mode: gatewayCfg?.models?.mode || embeddedCfg?.models?.mode || "merge",
    providers: mergedProviders
  };
}
function getAllAgentIds() {
  const state = loadAppState();
  const ids = /* @__PURE__ */ new Set(["main"]);
  for (const agent of state.agents || []) {
    if (String(agent?.id || "").trim()) ids.add(String(agent.id));
  }
  return Array.from(ids);
}
function getAgentModelsFile(agentId) {
  return path3.join(OPENCLAW_CONFIG_DIR, "agents", agentId, "agent", "models.json");
}
function syncAgentModelRegistries(explicitRelayApiKey) {
  try {
    const payload = JSON.stringify(buildAgentModelsPayload(explicitRelayApiKey), null, 2);
    for (const agentId of getAllAgentIds()) {
      const modelsFile = getAgentModelsFile(agentId);
      fs2.mkdirSync(path3.dirname(modelsFile), { recursive: true });
      const current = fs2.existsSync(modelsFile) ? fs2.readFileSync(modelsFile, "utf8") : "";
      if (current !== payload) {
        fs2.writeFileSync(modelsFile, payload, "utf8");
      }
    }
  } catch (e) {
    console.error("[auth-model-sync] failed:", e.message);
  }
}
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
async function refreshJwtIfNeeded(relayBaseUrl) {
  const state = loadAppState();
  const base = relayBaseUrl || state.relay?.baseUrl || RELAY_BASE_URL;
  const jwt = state.relay?.accessToken || "";
  if (!jwt) return "";
  const payload = decodeJwtPayload(jwt);
  if (!payload?.exp) return jwt;
  const nowSec = Math.floor(Date.now() / 1e3);
  const FIVE_MIN = 5 * 60;
  if (payload.exp > nowSec + FIVE_MIN) return jwt;
  const refreshToken = state.relay?.refreshToken || "";
  if (!refreshToken) {
    console.log("[auth] JWT expired and no refreshToken available");
    return "";
  }
  try {
    const url = base.replace(/\/+$/, "") + "/v1/auth/refresh";
    const res = await import_axios2.default.post(url, { refreshToken }, { timeout: 15e3 });
    const tokens = res.data?.tokens;
    if (!tokens?.accessToken) throw new Error("No accessToken in refresh response");
    state.relay.accessToken = tokens.accessToken;
    state.relay.refreshToken = tokens.refreshToken || refreshToken;
    saveAppState(state);
    syncAgentModelRegistries(tokens.accessToken);
    console.log("[auth] JWT refreshed successfully");
    return tokens.accessToken;
  } catch (e) {
    await logDnsDiagnostics("relay-auth-refresh", e, base.replace(/\/+$/, "") + "/v1/auth/refresh");
    const status = e?.response?.status;
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(`[auth] JWT refresh failed: ${status || ""} ${detail}`);
    if (state.relay) {
      state.relay.accessToken = "";
      state.relay.refreshToken = "";
      saveAppState(state);
      console.log("[auth] Cleared expired tokens \u2014 user needs to re-login");
    }
    return "";
  }
}
async function ensureGatewayProviderOrRelay() {
  try {
    const userProvider = getUserProviderConfig();
    if (userProvider) return;
    const state = loadAppState();
    const rawRelayUrl = state.relay?.baseUrl || RELAY_BASE_URL;
    const relayUrl = rawRelayUrl.replace(/\/+$/, "") + "/v1";
    const deviceToken = state.deviceToken || "";
    const deviceId = state.deviceId || "";
    const jwt = await refreshJwtIfNeeded(rawRelayUrl);
    if (!relayUrl || !jwt && !deviceToken && !deviceId) return;
    const relayApiKey = jwt || deviceToken || `device:${deviceId}`;
    const authType = jwt ? "jwt" : deviceToken ? "deviceToken" : "deviceId";
    console.log(`[auth] Using ${authType} for relay auth (key length: ${relayApiKey.length})`);
    const RELAY_PROVIDER = "relay";
    syncAuthProfileForProvider(RELAY_PROVIDER, relayApiKey);
    const headers = {};
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
    if (deviceId) headers["X-Device-Id"] = deviceId;
    const existingCfg = fs2.existsSync(CONFIG_FILE) ? JSON.parse(fs2.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    const cachedModels = existingCfg?.models?.providers?.relay?.models;
    let relayModels = [];
    if (cachedModels?.length) {
      console.log("[auth] Using cached relay models, refreshing in background");
      relayModels = cachedModels.map((m) => ({ id: m.id, name: m.name || m.id, available: true }));
      import_axios2.default.get(`${relayUrl}/models`, { headers, timeout: 1e4 }).then((res) => {
        const fresh = res.data?.data || [];
        if (fresh.length) {
          console.log("[auth] Background relay models refresh complete:", fresh.length, "models");
        }
      }).catch((error) => {
        void logDnsDiagnostics("relay-models-refresh-background", error, `${relayUrl}/models`);
      });
    } else {
      try {
        const res = await import_axios2.default.get(`${relayUrl}/models`, { headers, timeout: 1e4 });
        relayModels = res.data?.data || [];
      } catch (e) {
        await logDnsDiagnostics("relay-models-fetch", e, `${relayUrl}/models`);
        console.log("[auth] Failed to fetch relay models, using fallback:", e.message);
      }
    }
    const gatewayModels = relayModels.length ? relayModels.map((m) => ({ id: m.id, name: m.name || m.id, contextWindow: 18e4, maxTokens: 8192 })) : [{ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 18e4, maxTokens: 8192 }];
    const firstAvailable = relayModels.find((m) => m.available !== false);
    const defaultModel = firstAvailable?.id || gatewayModels[0].id;
    const ocCfg = fs2.existsSync(CONFIG_FILE) ? JSON.parse(fs2.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.models = ocCfg.models || {};
    ocCfg.models.mode = ocCfg.models.mode || "merge";
    ocCfg.models.providers = ocCfg.models.providers || {};
    const oldAnthropic = ocCfg.models.providers["anthropic"];
    if (oldAnthropic?.baseUrl?.includes("myopenclaw-relay-service")) {
      delete ocCfg.models.providers["anthropic"];
    }
    ocCfg.models.providers[RELAY_PROVIDER] = {
      ...ocCfg.models.providers[RELAY_PROVIDER] || {},
      baseUrl: relayUrl,
      api: "openai-completions",
      models: gatewayModels
    };
    ocCfg.agents = ocCfg.agents || {};
    ocCfg.agents.defaults = ocCfg.agents.defaults || {};
    ocCfg.agents.defaults.model = {
      ...ocCfg.agents.defaults.model || {},
      primary: `${RELAY_PROVIDER}/${defaultModel}`
    };
    const workspaceDir = path3.join(OPENCLAW_CONFIG_DIR, "workspace");
    fs2.mkdirSync(path3.join(workspaceDir, ".openclaw"), { recursive: true });
    ocCfg.agents.defaults.workspace = workspaceDir;
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.http = ocCfg.gateway.http || {};
    ocCfg.gateway.http.endpoints = ocCfg.gateway.http.endpoints || {};
    ocCfg.gateway.http.endpoints.chatCompletions = { enabled: true };
    if (ocCfg.tools?.profile) {
      delete ocCfg.tools.profile;
    }
    const newContent = JSON.stringify(ocCfg, null, 2);
    const oldContent = fs2.existsSync(CONFIG_FILE) ? fs2.readFileSync(CONFIG_FILE, "utf8") : "";
    if (newContent !== oldContent) {
      fs2.writeFileSync(CONFIG_FILE, newContent, "utf8");
      console.log("[auth] Configured relay provider fallback:", relayUrl);
    }
    syncAgentModelRegistries(relayApiKey);
  } catch (e) {
    console.error("[auth] ensureGatewayProviderOrRelay failed:", e.message);
  }
}

// src/deep-link.ts
function handleDeepLink(url, getMainWindow2) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;
    if (parsed.hostname === "auth" || parsed.pathname === "//auth" || parsed.pathname === "/auth") {
      const accessToken = parsed.searchParams.get("accessToken");
      const refreshToken = parsed.searchParams.get("refreshToken");
      const email = parsed.searchParams.get("email");
      if (accessToken) {
        const state = loadAppState();
        state.relay.baseUrl = RELAY_BASE_URL;
        state.relay.accessToken = accessToken;
        state.relay.refreshToken = refreshToken || "";
        state.relay.userEmail = email || "";
        saveAppState(state);
        console.log("[DeepLink] Auth tokens saved from web login");
        ensureGatewayProviderOrRelay().catch((err) => {
          console.log("[DeepLink] Gateway auth refresh failed (non-fatal):", err.message);
        });
        const deviceId = state.deviceId;
        if (deviceId) {
          const requestUrl = `${RELAY_BASE_URL}/v1/devices/${encodeURIComponent(deviceId)}/link`;
          import_axios3.default.post(requestUrl, {}, {
            headers: { "Authorization": `Bearer ${accessToken}` },
            timeout: 2e4
          }).then(() => {
            console.log("[DeepLink] Device linked to user account");
          }).catch((err) => {
            void logDnsDiagnostics("device-link", err, requestUrl);
            console.log("[DeepLink] Device link failed (non-fatal):", err.message);
          });
        }
        const mainWindow2 = getMainWindow2();
        if (mainWindow2 && !mainWindow2.isDestroyed()) {
          mainWindow2.webContents.executeJavaScript(`
            (async () => {
              if (typeof refreshState === 'function') await refreshState();
              if (typeof loadRelayConfig === 'function') loadRelayConfig();
              if (typeof loadDeviceInfo === 'function') loadDeviceInfo();
              if (typeof refreshQuota === 'function') refreshQuota();
              if (typeof fetchModels === 'function') fetchModels();
            })();
          `).catch(() => {
          });
          mainWindow2.show();
          mainWindow2.focus();
        }
      }
    }
  } catch (err) {
    console.error("[DeepLink] Failed to handle URL:", err.message);
  }
}

// src/window.ts
var path14 = __toESM(require("path"));
var fs14 = __toESM(require("fs"));
var import_electron15 = require("electron");

// src/runtime.ts
var path4 = __toESM(require("path"));
var fs3 = __toESM(require("fs"));
var os2 = __toESM(require("os"));
var import_axios4 = __toESM(require("axios"));
var import_child_process2 = require("child_process");
function execFileAsync(cmd, args, opts = {}) {
  return new Promise((resolve5, reject) => {
    const proc = (0, import_child_process2.spawn)(cmd, args, {
      stdio: "pipe",
      ...opts
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code, signal) => {
      if (code === 0) {
        resolve5(stdout);
        return;
      }
      const detail = stderr.trim() || stdout.trim() || `signal ${signal ?? "unknown"}`;
      reject(new Error(`Command failed: ${cmd} ${args.join(" ")} (${detail})`));
    });
  });
}
var _cachedCli;
var _verifiedBins = /* @__PURE__ */ new Map();
var _repairedRuntimeDirs = /* @__PURE__ */ new Set();
var DOWNLOADED_RUNTIME_STAMP_FILE = path4.join(DOWNLOADED_RUNTIME_DIR, ".runtime-info.json");
function clearCliCache() {
  _cachedCli = void 0;
  _verifiedBins.clear();
}
function getRuntimeTargetLabel() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return process.arch === "arm64" ? "mac_silicon" : "mac_intel";
  return "linux";
}
function readBundledRuntimeManifest() {
  const manifestPath = path4.join(__dirname, "resources", "runtime-manifest.json");
  if (!fs3.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs3.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    console.log(`[runtime] Failed to read runtime-manifest.json: ${e.message}`);
    return null;
  }
}
function getRuntimeTargetConfig(manifest, target = getRuntimeTargetLabel()) {
  const config = manifest?.[target];
  return config && typeof config === "object" ? config : null;
}
function getRuntimeUrls(config) {
  if (!config) return [];
  return Array.isArray(config.urls) ? config.urls : config.url ? [config.url] : [];
}
function getRuntimeCacheKey(config) {
  if (!config) return "none";
  const version = typeof config.version === "string" ? config.version.trim() : "";
  if (version) return `version:${version}`;
  return `urls:${getRuntimeUrls(config).join("|")}`;
}
function readDownloadedRuntimeStamp() {
  if (!fs3.existsSync(DOWNLOADED_RUNTIME_STAMP_FILE)) return null;
  try {
    const raw = JSON.parse(fs3.readFileSync(DOWNLOADED_RUNTIME_STAMP_FILE, "utf8"));
    if (typeof raw?.target === "string" && typeof raw?.cacheKey === "string") {
      return { target: raw.target, cacheKey: raw.cacheKey };
    }
  } catch {
  }
  return null;
}
function writeDownloadedRuntimeStamp(target, cacheKey) {
  fs3.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  fs3.writeFileSync(
    DOWNLOADED_RUNTIME_STAMP_FILE,
    JSON.stringify({ target, cacheKey }, null, 2),
    "utf8"
  );
}
function isDownloadedRuntimeCurrent(config, target = getRuntimeTargetLabel()) {
  if (!config) return true;
  const stamp = readDownloadedRuntimeStamp();
  if (!stamp) return false;
  return stamp.target === target && stamp.cacheKey === getRuntimeCacheKey(config);
}
function shouldUseDownloadedRuntime() {
  const manifest = readBundledRuntimeManifest();
  const config = getRuntimeTargetConfig(manifest);
  return isDownloadedRuntimeCurrent(config);
}
function clearDownloadedRuntime() {
  try {
    fs3.rmSync(DOWNLOADED_RUNTIME_DIR, { recursive: true, force: true });
  } catch (e) {
    console.log(`[runtime] Failed to clear stale runtime cache: ${e.message}`);
  }
  _repairedRuntimeDirs.delete(path4.resolve(DOWNLOADED_RUNTIME_DIR));
  clearCliCache();
}
function runtimeEntryExists(baseDir) {
  const distDir = path4.join(baseDir, "openclaw-deps", "openclaw", "dist");
  return fs3.existsSync(path4.join(distDir, "entry.js")) || fs3.existsSync(path4.join(distDir, "entry.mjs"));
}
function repairRuntimePermissions(baseDir) {
  if (process.platform === "win32") return;
  const resolvedBase = path4.resolve(baseDir);
  if (_repairedRuntimeDirs.has(resolvedBase)) return;
  const targets = [
    path4.join(resolvedBase, "openclaw-deps", ".bin"),
    path4.join(resolvedBase, "node")
  ];
  for (const dir of targets) {
    if (!fs3.existsSync(dir)) continue;
    try {
      (0, import_child_process2.execFileSync)("chmod", ["-R", "+x", dir], { stdio: "pipe" });
      console.log(`[runtime] Repaired permissions: ${dir}`);
    } catch (e) {
      console.log(`[runtime] Permission repair skipped for ${dir}: ${e.message}`);
    }
  }
  _repairedRuntimeDirs.add(resolvedBase);
}
function repairKnownRuntimePermissions() {
  repairRuntimePermissions(path4.join(__dirname, "resources"));
  repairRuntimePermissions(DOWNLOADED_RUNTIME_DIR);
}
async function downloadFile(url, outputPath, onProgress) {
  const writer = fs3.createWriteStream(outputPath);
  const response = await (0, import_axios4.default)({ method: "get", url, responseType: "stream", timeout: 0, maxRedirects: 10 });
  const total = Number(response.headers["content-length"] || 0);
  let loaded = 0;
  response.data.on("data", (chunk) => {
    loaded += chunk.length;
    if (total > 0 && typeof onProgress === "function") {
      onProgress(Math.max(0, Math.min(100, Math.round(loaded / total * 100))));
    }
  });
  response.data.pipe(writer);
  return new Promise((resolve5, reject) => {
    writer.on("finish", resolve5);
    writer.on("error", reject);
  });
}
async function downloadWithFallback(urls, outputPath, onProgress) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const label = i === 0 ? "CDN" : `mirror ${i}`;
    try {
      console.log(`[runtime] Trying ${label}: ${url}`);
      await downloadFile(url, outputPath, onProgress);
      console.log(`[runtime] Download succeeded from ${label}`);
      return;
    } catch (err) {
      console.error(`[runtime] Download failed from ${label}: ${err.message}`);
      try {
        fs3.unlinkSync(outputPath);
      } catch {
      }
      if (i === urls.length - 1) {
        throw new Error(`All download sources failed. Last error: ${err.message}`);
      }
      console.log(`[runtime] Falling back to next source...`);
    }
  }
}
function findRuntimeDir() {
  const embeddedBase = path4.join(__dirname, "resources");
  if (!embeddedBase.includes(".asar")) {
    if (runtimeEntryExists(embeddedBase)) {
      repairRuntimePermissions(embeddedBase);
      return embeddedBase;
    }
  }
  if (runtimeEntryExists(DOWNLOADED_RUNTIME_DIR)) {
    if (!shouldUseDownloadedRuntime()) {
      console.log("[runtime] Cached downloaded runtime is stale; waiting for refresh");
      return null;
    }
    repairRuntimePermissions(DOWNLOADED_RUNTIME_DIR);
    return DOWNLOADED_RUNTIME_DIR;
  }
  return null;
}
async function ensureEmbeddedRuntime(updateLoadingStatus2) {
  const manifest = readBundledRuntimeManifest();
  const target = getRuntimeTargetLabel();
  const config = getRuntimeTargetConfig(manifest, target);
  const urls = getRuntimeUrls(config);
  if (findRuntimeDir()) {
    console.log("[runtime] Runtime found");
    updateLoadingStatus2("Runtime ready", 72);
    return;
  }
  if (!manifest) {
    throw new Error("Missing runtime-manifest.json. Cannot download runtime automatically.");
  }
  if (!urls.length) {
    throw new Error(`No runtime download URL configured for platform "${target}". Please download the runtime manually or use the full installer.`);
  }
  const zipPath = path4.join(os2.tmpdir(), `myopenclaw-runtime-${target}.zip`);
  if (fs3.existsSync(DOWNLOADED_RUNTIME_DIR)) {
    console.log("[runtime] Clearing stale downloaded runtime before refresh...");
    clearDownloadedRuntime();
  }
  console.log(`[runtime] Downloading runtime for ${target}...`);
  updateLoadingStatus2("Downloading openclaw ...", 52);
  await downloadWithFallback(urls, zipPath, (p) => {
    updateLoadingStatus2(`Downloading openclaw ... ${p}%`, 52 + Math.round(p * 0.28));
  });
  console.log("[runtime] Extracting runtime...");
  updateLoadingStatus2("Extracting openclaw runtime...", 84);
  fs3.mkdirSync(DOWNLOADED_RUNTIME_DIR, { recursive: true });
  if (process.platform === "win32") {
    await execFileAsync("tar", ["-xf", zipPath, "-C", DOWNLOADED_RUNTIME_DIR], { stdio: "ignore", windowsHide: true });
  } else {
    await execFileAsync("unzip", ["-oq", zipPath, "-d", DOWNLOADED_RUNTIME_DIR], { stdio: "ignore" });
    repairRuntimePermissions(DOWNLOADED_RUNTIME_DIR);
  }
  if (!runtimeEntryExists(DOWNLOADED_RUNTIME_DIR)) {
    throw new Error("Runtime extracted but dist/entry.(m)js not found. The runtime package may be incomplete.");
  }
  writeDownloadedRuntimeStamp(target, getRuntimeCacheKey(config));
  if (process.platform === "win32") {
    addWindowsFirewallRule(path4.join(DOWNLOADED_RUNTIME_DIR, "node", "node.exe"));
  }
  console.log("[runtime] Runtime ready");
  updateLoadingStatus2("Runtime installed", 88);
}
function addWindowsFirewallRule(nodeExePath) {
  if (!fs3.existsSync(nodeExePath)) return;
  try {
    (0, import_child_process2.execFileSync)("netsh", [
      "advfirewall",
      "firewall",
      "add",
      "rule",
      "name=MyOpenClaw Runtime Node",
      "dir=in",
      "action=allow",
      `program=${nodeExePath}`,
      "enable=yes",
      "profile=any"
    ], { stdio: "pipe", timeout: 5e3, windowsHide: true });
    console.log("[firewall] Added firewall rule for node.exe");
  } catch {
    console.log("[firewall] Could not add firewall rule (needs admin privileges)");
  }
}
function buildNodeEnhancedPath() {
  repairKnownRuntimePermissions();
  const nodeExe = process.platform === "win32" ? "node.exe" : "node";
  const nodeDirs = [
    path4.join(__dirname, "resources", "node"),
    ...shouldUseDownloadedRuntime() ? [path4.join(DOWNLOADED_RUNTIME_DIR, "node")] : []
  ];
  const extra = nodeDirs.filter((d) => fs3.existsSync(path4.join(d, nodeExe)));
  if (process.platform === "win32") {
    extra.unshift(
      path4.join(MANAGED_TOOLS_DIR, "go", "bin"),
      path4.join(MANAGED_TOOLS_DIR, "uv")
    );
  }
  const deduped = extra.filter((entry, index) => extra.indexOf(entry) === index);
  return deduped.length > 0 ? `${deduped.join(path4.delimiter)}${path4.delimiter}${process.env.PATH}` : process.env.PATH;
}
function verifyOpenClawCli(binPath) {
  try {
    const stat = fs3.statSync(binPath);
    const prevMtime = _verifiedBins.get(binPath);
    if (prevMtime !== void 0 && stat.mtimeMs === prevMtime) {
      return true;
    }
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(binPath);
    (0, import_child_process2.execFileSync)(binPath, ["--version"], {
      encoding: "utf8",
      timeout: 1e4,
      stdio: "pipe",
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath(),
        OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
        OPENCLAW_CONFIG_PATH: CONFIG_FILE
      },
      shell: useShell,
      windowsHide: true
    });
    _verifiedBins.set(binPath, stat.mtimeMs);
    return true;
  } catch (e) {
    console.log(`[cli] Verification failed for ${binPath}:`, e.message);
    return false;
  }
}
function findOpenClawCli() {
  if (_cachedCli !== void 0) return _cachedCli;
  repairKnownRuntimePermissions();
  const binNames = process.platform === "win32" ? ["openclaw.cmd", "openclaw.exe", "openclaw"] : ["openclaw"];
  const ownCandidates = [];
  for (const bin of binNames) {
    const embeddedBin = path4.join(__dirname, "resources", "openclaw-deps", ".bin", bin);
    if (!embeddedBin.includes(".asar")) {
      ownCandidates.push(embeddedBin);
    }
    if (shouldUseDownloadedRuntime()) {
      ownCandidates.push(path4.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", ".bin", bin));
    }
  }
  const seen = /* @__PURE__ */ new Set();
  for (const p of ownCandidates) {
    const resolved = path4.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs3.existsSync(p)) continue;
    console.log(`[cli] Found own runtime: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Verified own openclaw CLI: ${p}`);
      _cachedCli = p;
      return p;
    }
  }
  const systemCandidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process2.execFileSync)(cmd, ["openclaw"], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim();
    if (result) systemCandidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os2.homedir();
  systemCandidates.push(
    path4.join(home, ".local", "bin", "openclaw"),
    "/usr/local/bin/openclaw"
  );
  const nvmDir = path4.join(home, ".nvm", "versions", "node");
  try {
    if (fs3.existsSync(nvmDir)) {
      const versions = fs3.readdirSync(nvmDir).filter((v) => v.startsWith("v")).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
      for (const ver of versions) {
        systemCandidates.push(path4.join(nvmDir, ver, "bin", "openclaw"));
      }
    }
  } catch {
  }
  for (const p of systemCandidates) {
    const resolved = path4.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs3.existsSync(p)) continue;
    console.log(`[cli] Found system candidate: ${p}, verifying...`);
    if (verifyOpenClawCli(p)) {
      console.log(`[cli] Using system openclaw CLI: ${p}`);
      _cachedCli = p;
      return p;
    }
  }
  _cachedCli = null;
  return null;
}
function findNodeBinary() {
  repairKnownRuntimePermissions();
  const nodeExe = process.platform === "win32" ? "node.exe" : "node";
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const nodePath = (0, import_child_process2.execFileSync)(cmd, [nodeExe], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim().split(/\r?\n/)[0];
    if (nodePath) {
      const ver = (0, import_child_process2.execFileSync)(nodePath, ["--version"], { encoding: "utf8", timeout: 3e3, windowsHide: true }).trim();
      const major = parseInt(ver.replace("v", "").split(".")[0], 10);
      if (major >= MIN_NODE_MAJOR_VERSION) {
        console.log(`[node] Using system node: ${nodePath} (${ver})`);
        return nodePath;
      }
      console.log(`[node] System node too old: ${ver} (need >= ${MIN_NODE_MAJOR_VERSION})`);
    }
  } catch {
  }
  const candidates = [
    path4.join(__dirname, "resources", "node", nodeExe),
    ...shouldUseDownloadedRuntime() ? [path4.join(DOWNLOADED_RUNTIME_DIR, "node", nodeExe)] : []
  ];
  for (const p of candidates) {
    if (fs3.existsSync(p)) {
      console.log(`[node] Using bundled node: ${p}`);
      return p;
    }
  }
  throw new Error(`No suitable Node.js found (>= ${MIN_NODE_MAJOR_VERSION}). Please install Node.js or use the full version of MyOpenClaw.`);
}
function ensureOpenClawInPath(openclawBin) {
  if (!openclawBin) return;
  try {
    const binDir = path4.dirname(fs3.realpathSync(openclawBin));
    if (!process.env.PATH.includes(binDir)) {
      const sep = process.platform === "win32" ? ";" : ":";
      process.env.PATH = `${binDir}${sep}${process.env.PATH}`;
      console.log(`[path] Added to process PATH: ${binDir}`);
    }
  } catch (e) {
    console.error("[path] ensureOpenClawInPath failed:", e.message);
  }
}
function runOpenClawOnboard(cmd, prependArgs = [], cwd) {
  return new Promise((resolve5, _reject) => {
    const args = [
      ...prependArgs,
      "onboard",
      "--non-interactive",
      "--accept-risk",
      "--skip-channels",
      "--skip-daemon",
      "--skip-health",
      "--skip-skills",
      "--skip-ui",
      "--auth-choice",
      "skip",
      "--gateway-port",
      String(DEFAULT_PORT)
    ];
    const env = {
      ...process.env,
      PATH: buildNodeEnhancedPath(),
      OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
      OPENCLAW_CONFIG_PATH: CONFIG_FILE
    };
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);
    console.log(`[onboard] Running: ${cmd} ${args.join(" ")}`);
    const proc = (0, import_child_process2.spawn)(cmd, args, { stdio: "pipe", env, shell: useShell, windowsHide: true, ...cwd ? { cwd } : {} });
    let output = "";
    proc.stdout.on("data", (d) => {
      output += d;
      console.log(`[onboard] ${d}`);
    });
    proc.stderr.on("data", (d) => {
      output += d;
      console.error(`[onboard] ${d}`);
    });
    proc.on("close", (code) => {
      if (code === 0) {
        console.log("[onboard] Setup complete");
        resolve5(output);
      } else {
        console.error(`[onboard] Exited with code ${code}`);
        resolve5(output);
      }
    });
    proc.on("error", (err) => {
      console.error("[onboard] Error:", err.message);
      resolve5("");
    });
  });
}

// src/gateway.ts
var path5 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var os4 = __toESM(require("os"));
var crypto3 = __toESM(require("crypto"));
var import_child_process3 = require("child_process");

// src/log-reporter.ts
var import_electron = require("electron");
var import_axios5 = __toESM(require("axios"));
var os3 = __toESM(require("os"));
var FLUSH_INTERVAL_MS = 3e4;
var MAX_BUFFER = 100;
var buffer = [];
var flushTimer = null;
function getRelayUrl() {
  const state = loadAppState();
  return state.relay?.baseUrl || RELAY_BASE_URL;
}
function getDeviceId() {
  const state = loadAppState();
  return state.deviceId || "unknown";
}
async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, 50);
  const baseUrl = getRelayUrl();
  const deviceId = getDeviceId();
  const state = loadAppState();
  const userEmail = state.relay?.userEmail || "";
  const logs = batch.map((e) => ({
    level: e.level,
    category: e.category,
    message: e.message,
    meta: e.meta ?? null,
    userEmail: userEmail || null,
    appVersion: import_electron.app.getVersion(),
    platform: `${os3.platform()}-${os3.arch()}`
  }));
  try {
    await import_axios5.default.post(`${baseUrl}/v1/logs`, { logs }, {
      headers: { "X-Device-Id": deviceId },
      timeout: 5e3
    });
  } catch {
  }
}
function reportError(category, message, meta) {
  buffer.push({ level: "error", category, message, meta, ts: (/* @__PURE__ */ new Date()).toISOString() });
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  void flush();
}
function startLogReporter() {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}
async function stopLogReporter() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flush();
}

// src/gateway.ts
var import_axios7 = __toESM(require("axios"));

// src/network.ts
var net = __toESM(require("net"));
var import_axios6 = __toESM(require("axios"));
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error("No available port found");
}
function isPortAvailable(port) {
  return new Promise((resolve5) => {
    const server = net.createServer();
    server.once("error", () => resolve5(false));
    server.once("listening", () => {
      server.close();
      resolve5(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

// src/perf-monitor.ts
var SAMPLE_INTERVAL = 6e4;
var WARN_CPU_PCT = 80;
var WARN_MEM_MB = 512;
var _timer = null;
var _prevCpu = process.cpuUsage();
var _prevTime = Date.now();
var _gatewayProc = null;
function sample() {
  const now = Date.now();
  const elapsed = (now - _prevTime) * 1e3;
  if (elapsed <= 0) return;
  const cpu = process.cpuUsage(_prevCpu);
  _prevCpu = process.cpuUsage();
  _prevTime = now;
  const cpuPct = (cpu.user + cpu.system) / elapsed * 100;
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  let gwInfo = "";
  if (_gatewayProc?.pid && !_gatewayProc.killed) {
    gwInfo = ` | gateway PID=${_gatewayProc.pid}`;
  }
  const line = `[perf] cpu=${cpuPct.toFixed(1)}% rss=${rssMB}MB heap=${heapMB}/${heapTotalMB}MB${gwInfo}`;
  if (cpuPct > WARN_CPU_PCT || rssMB > WARN_MEM_MB) {
    console.warn(line);
    if (cpuPct > WARN_CPU_PCT) {
      console.warn(`[perf] HIGH CPU: ${cpuPct.toFixed(1)}% (threshold: ${WARN_CPU_PCT}%)`);
    }
    if (rssMB > WARN_MEM_MB) {
      console.warn(`[perf] HIGH MEMORY: ${rssMB}MB RSS (threshold: ${WARN_MEM_MB}MB)`);
    }
  } else {
    console.log(line);
  }
}
function startPerfMonitor(gatewayProcess) {
  if (_timer) return;
  if (gatewayProcess) _gatewayProc = gatewayProcess;
  _prevCpu = process.cpuUsage();
  _prevTime = Date.now();
  _timer = setInterval(sample, SAMPLE_INTERVAL);
  if (_timer.unref) _timer.unref();
  console.log(`[perf] Monitor started (interval=${SAMPLE_INTERVAL / 1e3}s, cpu_warn=${WARN_CPU_PCT}%, mem_warn=${WARN_MEM_MB}MB)`);
}
function updateGatewayProcess(proc) {
  _gatewayProc = proc;
}

// src/gateway.ts
var GATEWAY_START_TIMEOUT_MS = 12e4;
var GATEWAY_HEALTHCHECK_TIMEOUT_MS = 2e3;
var GATEWAY_HEALTHCHECK_POLL_MS = 300;
async function startGateway(updateLoadingStatus2) {
  try {
    if (process.platform === "win32") {
      await new Promise((resolve5) => {
        (0, import_child_process3.execFile)("powershell.exe", [
          "-NoProfile",
          "-Command",
          `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*myopenclaw*' -and $_.CommandLine -like '*gateway*' } | ForEach-Object { Write-Host "Killing PID $($_.ProcessId): $($_.CommandLine.Substring(0, [Math]::Min(80, $_.CommandLine.Length)))"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
        ], { encoding: "utf8", timeout: 15e3, windowsHide: true }, (err, stdout) => {
          const killed = (stdout || "").trim();
          if (killed) console.log("[startGateway] Killed leftover processes:", killed);
          resolve5();
        });
      });
    } else {
      (0, import_child_process3.execSync)("ps -eo pid,command | grep 'myopenclaw' | grep 'gateway' | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null", { timeout: 5e3, stdio: "pipe" });
    }
  } catch (e) {
    console.log("[startGateway] Process cleanup:", e.message?.slice(0, 100));
  }
  if (process.platform === "win32") {
    const lf = resolveGatewayLockFile();
    for (let waited = 0; waited < 3e3; waited += 300) {
      try {
        if (!fs4.existsSync(lf) || fs4.readFileSync(lf, "utf8")) break;
      } catch {
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  const gatewayPort = await findAvailablePort(DEFAULT_PORT);
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
  console.log(`[startGateway] Starting gateway on port ${gatewayPort}...`);
  updateLoadingStatus2("Establishing secure connections...", 48);
  ensureAuthProfilesFromEmbeddedConfig();
  await ensureGatewayProviderOrRelay();
  const gatewayToken = ensureRandomGatewayToken();
  try {
    const ocCfg = fs4.existsSync(CONFIG_FILE) ? JSON.parse(fs4.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.gateway = ocCfg.gateway || {};
    ocCfg.gateway.auth = ocCfg.gateway.auth || {};
    ocCfg.gateway.auth.token = gatewayToken;
    ocCfg.gateway.auth.mode = "token";
    const embeddedCfg = loadEmbeddedConfig();
    if (embeddedCfg.channels && Object.keys(embeddedCfg.channels).length > 0) {
      ocCfg.channels = { ...ocCfg.channels || {}, ...embeddedCfg.channels };
      console.log("[startGateway] Synced channels to openclaw.json:", Object.keys(embeddedCfg.channels).join(", "));
    }
    fs4.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
    console.log("[startGateway] Synced gateway token to openclaw.json");
  } catch (e) {
    console.error("[startGateway] Failed to sync token to openclaw.json:", e.message);
  }
  updateLoadingStatus2("Launching openclaw gateway...", 90);
  forceCleanGatewayLock();
  const gatewayEnv = {
    ...process.env,
    PATH: buildNodeEnhancedPath(),
    OPENCLAW_STATE_DIR: OPENCLAW_CONFIG_DIR,
    OPENCLAW_CONFIG_PATH: CONFIG_FILE,
    OPENCLAW_GATEWAY_PORT: String(gatewayPort),
    OPENCLAW_SERVICE_MARKER: "myopenclaw",
    OPENCLAW_SERVICE_KIND: "gateway"
  };
  let gatewayProcess;
  const openclawBin = findOpenClawCli();
  if (openclawBin) {
    console.log(`[startGateway] Using openclaw CLI: ${openclawBin}`);
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(openclawBin);
    gatewayProcess = (0, import_child_process3.spawn)(openclawBin, ["gateway", "run", "--port", String(gatewayPort), "--allow-unconfigured"], {
      stdio: "pipe",
      env: gatewayEnv,
      shell: useShell,
      windowsHide: true
    });
  } else {
    const runtimeDir = findRuntimeDir() || path5.join(__dirname, "resources");
    const entryMjs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
    const entryJs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
    const entryFile = fs4.existsSync(entryMjs) ? entryMjs : entryJs;
    const nodeBin = findNodeBinary();
    console.log(`[startGateway] Fallback: ${nodeBin} ${entryFile} gateway run --port ${gatewayPort}`);
    gatewayProcess = (0, import_child_process3.spawn)(nodeBin, [entryFile, "gateway", "run", "--port", String(gatewayPort), "--allow-unconfigured"], {
      stdio: "pipe",
      cwd: runtimeDir,
      env: gatewayEnv,
      ...process.platform === "win32" ? { windowsHide: true } : {}
    });
  }
  let gatewayExited = false;
  let gatewayExitCode = null;
  gatewayProcess.stdout.on("data", (data) => console.log(`[Gateway stdout] ${data}`));
  gatewayProcess.stderr.on("data", (data) => console.error(`[Gateway stderr] ${data}`));
  gatewayProcess.on("exit", (code, signal) => {
    gatewayExited = true;
    gatewayExitCode = code;
    console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
    if (code !== 0) {
      console.error("[Gateway] Unexpected exit!");
      reportError("gateway", `unexpected exit code=${code} signal=${signal}`);
    }
  });
  gatewayProcess.on("error", (err) => {
    console.error("[Gateway] Process error:", err);
    reportError("gateway", `process error: ${err.message}`);
  });
  updateGatewayProcess(gatewayProcess);
  console.log("[startGateway] Waiting for gateway to start...");
  updateLoadingStatus2("Checking gateway health...", 94);
  await new Promise((resolve5) => setTimeout(resolve5, 500));
  if (gatewayExited) {
    throw new Error(`Gateway process exited immediately with code ${gatewayExitCode}. Check logs above for details.`);
  }
  await waitForGateway(gatewayBaseUrl, GATEWAY_START_TIMEOUT_MS, () => gatewayExited);
  updateLoadingStatus2("Startup complete. Opening workspace...", 100);
  console.log(`[startGateway] Gateway started successfully on ${gatewayBaseUrl}`);
  tryDoctorFix().catch(() => {
  });
  return {
    port: gatewayPort,
    baseUrl: gatewayBaseUrl,
    process: gatewayProcess,
    token: readGatewayTokenFromConfig()
  };
}
async function waitForGateway(gatewayBaseUrl, startupTimeoutMs = GATEWAY_START_TIMEOUT_MS, hasProcessExited) {
  const deadline = Date.now() + startupTimeoutMs;
  let attempts = 0;
  console.log(`[waitForGateway] Checking ${gatewayBaseUrl}/health (timeout=${startupTimeoutMs}ms)...`);
  while (Date.now() < deadline) {
    if (hasProcessExited?.()) {
      console.error("[waitForGateway] Gateway process exited, aborting health checks");
      throw new Error("Gateway process exited unexpectedly. Check logs above for details.");
    }
    attempts += 1;
    const remainingMs = Math.max(deadline - Date.now(), 1);
    try {
      console.log(`[waitForGateway] Attempt ${attempts} (remaining ${remainingMs}ms)...`);
      const response = await import_axios7.default.get(`${gatewayBaseUrl}/health`, {
        timeout: Math.min(GATEWAY_HEALTHCHECK_TIMEOUT_MS, remainingMs)
      });
      console.log(`[waitForGateway] Success! Response:`, response.data);
      return true;
    } catch (error) {
      console.log(`[waitForGateway] Attempt ${attempts} failed:`, error.message);
      const delayMs = Math.min(GATEWAY_HEALTHCHECK_POLL_MS, Math.max(deadline - Date.now(), 0));
      if (delayMs > 0) {
        await new Promise((resolve5) => setTimeout(resolve5, delayMs));
      }
    }
  }
  console.error(`[waitForGateway] Startup timeout reached after ${startupTimeoutMs}ms, gateway failed to start`);
  reportError("gateway", `startup timeout after ${startupTimeoutMs}ms`);
  throw new Error(`Gateway failed to start within ${Math.round(startupTimeoutMs / 1e3)}s. Please check your configuration and try again.`);
}
function isProcessRunning(proc) {
  return !!proc?.pid && proc.exitCode == null && proc.signalCode == null && !proc.killed;
}
async function waitForProcessExit(proc, timeoutMs) {
  if (!isProcessRunning(proc)) return true;
  return await new Promise((resolve5) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      proc.off("exit", onExit);
      proc.off("close", onExit);
      resolve5(result);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    proc.once("exit", onExit);
    proc.once("close", onExit);
  });
}
function forceKillProcess(proc) {
  if (!isProcessRunning(proc)) return;
  try {
    if (process.platform === "win32" && proc.pid) {
      (0, import_child_process3.execFileSync)("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        timeout: 5e3,
        stdio: "pipe",
        windowsHide: true
      });
      return;
    }
    proc.kill("SIGKILL");
  } catch (err) {
    console.warn("[gateway] Force kill failed:", err?.message || err);
  }
}
function requestProcessStop(proc) {
  if (!isProcessRunning(proc)) return;
  try {
    if (process.platform === "win32" && proc.pid) {
      (0, import_child_process3.execFileSync)("taskkill", ["/PID", String(proc.pid), "/T"], {
        timeout: 5e3,
        stdio: "pipe",
        windowsHide: true
      });
      return;
    }
    proc.kill("SIGTERM");
  } catch (err) {
    console.warn("[gateway] Graceful stop signal failed:", err?.message || err);
  }
}
async function stopGatewayGracefully(gatewayProcess, timeoutMs = 3e3) {
  requestProcessStop(gatewayProcess);
  const exited = await waitForProcessExit(gatewayProcess, Math.max(1e3, timeoutMs - 500));
  if (!exited) {
    console.warn("[gateway] Gateway did not stop in time, forcing shutdown");
    forceKillProcess(gatewayProcess);
    await waitForProcessExit(gatewayProcess, 1e3);
  }
  removeGatewayLockFile();
  updateGatewayProcess(null);
}
function stopGatewayImmediately(gatewayProcess) {
  forceKillProcess(gatewayProcess);
  removeGatewayLockFile();
  updateGatewayProcess(null);
}
function resolveGatewayLockFile() {
  const hash = crypto3.createHash("sha256").update(path5.resolve(CONFIG_FILE)).digest("hex").slice(0, 8);
  const uid = process.getuid?.();
  const lockDir = path5.join(os4.tmpdir(), uid != null ? `openclaw-${uid}` : "openclaw");
  return path5.join(lockDir, `gateway.${hash}.lock`);
}
function forceCleanGatewayLock() {
  try {
    const lockFile = resolveGatewayLockFile();
    if (!fs4.existsSync(lockFile)) return;
    try {
      const lock = JSON.parse(fs4.readFileSync(lockFile, "utf8"));
      const pid = lock?.pid;
      if (pid && typeof pid === "number") {
        console.log(`[startGateway] Lock held by PID ${pid}, force-killing...`);
        try {
          if (process.platform === "win32") {
            (0, import_child_process3.execSync)(`taskkill /F /PID ${pid}`, { timeout: 5e3, stdio: "pipe", windowsHide: true });
          } else {
            process.kill(pid, "SIGKILL");
          }
          console.log(`[startGateway] Killed PID ${pid}`);
        } catch {
          console.log(`[startGateway] PID ${pid} already dead or inaccessible`);
        }
      }
    } catch {
    }
    fs4.unlinkSync(lockFile);
    console.log(`[startGateway] Removed lock file: ${lockFile}`);
  } catch (e) {
    console.log("[startGateway] Lock cleanup failed:", e.message);
  }
}
function removeGatewayLockFile() {
  try {
    const lockFile = resolveGatewayLockFile();
    if (fs4.existsSync(lockFile)) {
      fs4.unlinkSync(lockFile);
      console.log(`[gateway] Removed lock file: ${lockFile}`);
    }
  } catch (err) {
    console.warn("[gateway] Failed to remove lock file:", err?.message || err);
  }
}
async function tryDoctorFix() {
  const runDoctor = (cmd, args, opts) => {
    return new Promise((resolve5) => {
      (0, import_child_process3.execFile)(cmd, args, { encoding: "utf8", timeout: 15e3, stdio: "pipe", ...opts }, (err, stdout) => {
        const output = String(stdout || "");
        if (!err && (output.includes("fix") || output.includes("removed") || output.includes("Unrecognized"))) {
          console.log("[doctor] Auto-fixed config:", output.trim());
        }
        resolve5();
      });
    });
  };
  const cli = findOpenClawCli();
  if (cli) {
    const env2 = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cli);
    await runDoctor(cli, ["doctor", "--fix"], {
      env: env2,
      shell: useShell,
      ...process.platform === "win32" ? { windowsHide: true } : {}
    });
    return;
  }
  const runtimeDir = findRuntimeDir();
  if (!runtimeDir) return;
  const entryMjs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
  const entryJs = path5.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
  const entryFile = fs4.existsSync(entryMjs) ? entryMjs : entryJs;
  const nodeBin = findNodeBinary();
  const env = { ...process.env, PATH: buildNodeEnhancedPath(), OPENCLAW_CONFIG_PATH: CONFIG_FILE };
  await runDoctor(nodeBin, [entryFile, "doctor", "--fix"], { env, cwd: runtimeDir, windowsHide: true });
}

// src/ipc/gateway-ipc.ts
var import_electron2 = require("electron");
function registerGatewayHandlers(getGatewayHandle) {
  import_electron2.ipcMain.handle("get-gateway-info", async () => {
    const gw = getGatewayHandle();
    return {
      port: gw?.port ?? null,
      baseUrl: gw?.baseUrl ?? null,
      token: readGatewayTokenFromConfig()
    };
  });
  import_electron2.ipcMain.handle("open-gateway-dashboard", async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl && !gw?.port) {
        return { success: false, error: "Gateway is not running. Please configure a local gateway first." };
      }
      const url = buildDashboardUrl(
        gw?.baseUrl || `http://127.0.0.1:${gw?.port || DEFAULT_PORT}`,
        gw?.baseUrl
      );
      await import_electron2.shell.openExternal(url);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("open-external", async (_event, url) => {
    try {
      await import_electron2.shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("get-startup-error", async () => {
    return { error: global.__MYOPENCLAW_STARTUP_ERROR__ || "" };
  });
}

// src/ipc/chat-ipc.ts
var import_electron3 = require("electron");
var import_fs = require("fs");

// src/messaging.ts
var import_axios8 = __toESM(require("axios"));
async function checkRelayHealth(baseUrl, token) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const requestUrl = `${baseUrl}/health`;
  try {
    const response = await import_axios8.default.get(requestUrl, {
      headers,
      timeout: 2e4
    });
    return response.data;
  } catch (error) {
    await logDnsDiagnostics("relay-health", error, requestUrl);
    throw error;
  }
}
async function sendViaRelay(relayBaseUrl, relayAuthToken, messages, deviceId, model) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (relayAuthToken) {
    headers["Authorization"] = `Bearer ${relayAuthToken}`;
  }
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
  }
  const requestUrl = `${relayBaseUrl}/v1/chat/completions`;
  try {
    const response = await import_axios8.default.post(requestUrl, {
      model: model || "openclaw:main",
      messages
    }, {
      headers,
      timeout: 6e4
    });
    return response?.data?.choices?.[0]?.message?.content || "No response from relay.";
  } catch (error) {
    await logDnsDiagnostics("relay-chat", error, requestUrl);
    throw error;
  }
}

// src/ws-manager.ts
var import_ws = require("ws");
var import_crypto = require("crypto");

// src/device-identity.ts
var crypto4 = __toESM(require("crypto"));
var fs5 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
var IDENTITY_DIR = path6.join(OPENCLAW_CONFIG_DIR, "identity");
var KEYPAIR_FILE = path6.join(IDENTITY_DIR, "device.json");
var DEVICE_AUTH_FILE = path6.join(IDENTITY_DIR, "device-auth.json");
function ensureIdentityDir() {
  fs5.mkdirSync(IDENTITY_DIR, { recursive: true });
}
function loadKeypair() {
  try {
    if (fs5.existsSync(KEYPAIR_FILE)) {
      const data = JSON.parse(fs5.readFileSync(KEYPAIR_FILE, "utf8"));
      if (data.publicKey && data.privateKey) return data;
    }
  } catch (e) {
    console.warn("[device-identity] Failed to load keypair:", e.message);
  }
  return null;
}
function ensureKeypair() {
  const existing = loadKeypair();
  if (existing) return existing;
  ensureIdentityDir();
  const { publicKey, privateKey } = crypto4.generateKeyPairSync("ed25519");
  const stored = {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" })
  };
  fs5.writeFileSync(KEYPAIR_FILE, JSON.stringify(stored, null, 2), "utf8");
  fs5.chmodSync(KEYPAIR_FILE, 384);
  console.log("[device-identity] Generated new Ed25519 keypair");
  return stored;
}
function getRawPublicKey(pem) {
  const keyObj = crypto4.createPublicKey(pem);
  const spki = keyObj.export({ type: "spki", format: "der" });
  return Buffer.from(spki).subarray(12);
}
function deriveDeviceId2(rawPubKey) {
  return crypto4.createHash("sha256").update(rawPubKey).digest("hex");
}
function saveDeviceAuthToken(token) {
  ensureIdentityDir();
  fs5.writeFileSync(
    DEVICE_AUTH_FILE,
    JSON.stringify({ deviceToken: token }, null, 2),
    "utf8"
  );
  fs5.chmodSync(DEVICE_AUTH_FILE, 384);
  console.log("[device-identity] Saved device auth token");
}
var CLIENT_ID = "cli";
var CLIENT_MODE = "cli";
var ROLE = "operator";
var SCOPES = [
  "operator.admin",
  "operator.approvals",
  "operator.pairing",
  "operator.read",
  "operator.write"
];
function buildConnectParams(gatewayToken, challengeNonce) {
  const kp = ensureKeypair();
  const rawPub = getRawPublicKey(kp.publicKey);
  const deviceId = deriveDeviceId2(rawPub);
  const signedAt = Date.now();
  const scopesCsv = [...SCOPES].sort().join(",");
  const tokenStr = gatewayToken || "";
  const payload = `v2|${deviceId}|${CLIENT_ID}|${CLIENT_MODE}|${ROLE}|${scopesCsv}|${signedAt}|${tokenStr}|${challengeNonce}`;
  const privateKey = crypto4.createPrivateKey(kp.privateKey);
  const signature = crypto4.sign(null, Buffer.from(payload, "utf8"), privateKey);
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: CLIENT_ID,
      version: "1.0.0",
      platform: process.platform,
      mode: CLIENT_MODE
    },
    caps: [],
    role: ROLE,
    scopes: SCOPES,
    device: {
      id: deviceId,
      publicKey: rawPub.toString("base64url"),
      signature: signature.toString("base64url"),
      signedAt,
      nonce: challengeNonce
    },
    auth: {
      token: gatewayToken
    }
  };
}
function handleConnectResponse(payload) {
  try {
    const p = payload;
    const auth = p?.auth;
    if (auth?.deviceToken && typeof auth.deviceToken === "string") {
      saveDeviceAuthToken(auth.deviceToken);
    }
  } catch {
  }
}

// src/ws-manager.ts
var WsManager = class {
  constructor() {
    this.ws = null;
    this.baseUrl = "";
    this.token = "";
    this.pending = /* @__PURE__ */ new Map();
    this.mainWindow = null;
    this.streamCallbacks = /* @__PURE__ */ new Set();
    this.activeStreamId = null;
    this.activeRunId = null;
    this.activeSessionKey = null;
    this.activeTerminalTimer = null;
    /** Stable session IDs per agent so conversation context persists across messages. */
    this.sessionIds = /* @__PURE__ */ new Map();
  }
  setWindow(win) {
    this.mainWindow = win;
  }
  connect(baseUrl, token) {
    if (this.baseUrl && this.baseUrl !== baseUrl) {
      this.disconnect();
    }
    this.baseUrl = baseUrl;
    this.token = token;
    if (this.ws && this.ws.readyState === import_ws.WebSocket.OPEN) {
      return Promise.resolve();
    }
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
    return new Promise((resolve5, reject) => {
      const ws = new import_ws.WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const connectId = (0, import_crypto.randomUUID)();
      let connected = false;
      ws.once("open", () => {
        console.log("[WsManager] WebSocket open, waiting for connect.challenge...");
      });
      ws.once("error", (err) => {
        console.error("[WsManager] WebSocket connection error:", err.message);
        reportError("ws", `connection error: ${err.message}`);
        reject(err);
      });
      ws.on("message", (data) => {
        const raw = String(data);
        if (!connected) {
          try {
            const msg = JSON.parse(raw);
            if (msg.type === "event" && msg.event === "connect.challenge") {
              const challengeNonce = msg.payload?.nonce;
              console.log("[WsManager] Received connect.challenge, sending signed connect...");
              ws.send(JSON.stringify({
                type: "req",
                id: connectId,
                method: "connect",
                params: buildConnectParams(token, challengeNonce)
              }));
              return;
            }
            if (msg.type === "event") return;
            if (msg.type === "res" && msg.id === connectId && msg.ok) {
              console.log("[WsManager] Connected to gateway WebSocket");
              handleConnectResponse(msg.payload);
              connected = true;
              this.ws = ws;
              resolve5();
              return;
            }
            if (msg.type === "res" && msg.id === connectId && !msg.ok) {
              const errMsg = typeof msg.error === "object" ? msg.error?.message : String(msg.error);
              reject(new Error(`Connect failed: ${errMsg}`));
              ws.close();
              return;
            }
          } catch {
          }
          return;
        }
        this._handleMessage(raw);
      });
      ws.on("close", () => {
        console.log("[WsManager] WebSocket closed");
        this.ws = null;
        this.pending.forEach((cb) => cb(new Error("WebSocket closed")));
        this.pending.clear();
      });
      ws.on("error", (err) => {
        console.error("[WsManager] WebSocket error:", err.message);
        reportError("ws", `ws error: ${err.message}`);
      });
    });
  }
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  isConnected() {
    return this.ws !== null && this.ws.readyState === import_ws.WebSocket.OPEN;
  }
  /**
   * Send a chat message via WebSocket JSON-RPC.
   * Streams delta events to the renderer window.
   * Returns the fully assembled text content when streaming completes.
   */
  async sendChatMessageStreaming(baseUrl, token, agentId, message, model) {
    if (!this.isConnected()) {
      await this.connect(baseUrl, token);
    }
    const id = (0, import_crypto.randomUUID)();
    const sessionKey = `agent:${agentId}:myopenclaw:${this._getSessionId(agentId)}`;
    this.activeStreamId = id;
    this.activeRunId = null;
    this.activeSessionKey = sessionKey;
    this._clearActiveTerminalTimer();
    let assembledText = "";
    const onPayload = (payload) => {
      if (payload.state === "delta" || payload.state === "final") {
        const fullText = this._extractText(payload.message?.content);
        if (fullText) {
          assembledText = fullText;
        }
      }
    };
    this.streamCallbacks.add(onPayload);
    const req = {
      type: "req",
      id,
      method: "chat.send",
      params: {
        sessionKey,
        message,
        deliver: false,
        idempotencyKey: id,
        ...model ? { model } : {}
      }
    };
    return new Promise((resolve5, reject) => {
      const timeout = setTimeout(() => {
        const cb = this.pending.get(id);
        if (!cb) return;
        this.pending.delete(id);
        cb(new Error("Chat response timed out"));
      }, 7e4);
      this.pending.set(id, (err) => {
        this.streamCallbacks.delete(onPayload);
        clearTimeout(timeout);
        if (this.activeStreamId === id) {
          this.activeStreamId = null;
          this.activeRunId = null;
          this.activeSessionKey = null;
          this._clearActiveTerminalTimer();
        }
        if (err) {
          reject(err);
        } else {
          resolve5(assembledText || "Response received.");
        }
      });
      if (!this.ws || this.ws.readyState !== import_ws.WebSocket.OPEN) {
        this.pending.delete(id);
        this.streamCallbacks.delete(onPayload);
        clearTimeout(timeout);
        reject(new Error("WebSocket not connected"));
        return;
      }
      this.ws.send(JSON.stringify(req), (sendErr) => {
        if (sendErr) {
          this.pending.delete(id);
          this.streamCallbacks.delete(onPayload);
          clearTimeout(timeout);
          reject(sendErr);
        }
      });
    });
  }
  /** Extract text from a content array (or string). */
  _extractText(content) {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";
    let text = "";
    for (const item of content) {
      if (typeof item === "string") {
        text += item;
        continue;
      }
      if (item && typeof item === "object") {
        if (item.type === "text" && item.text) text += item.text;
      }
    }
    return text;
  }
  _clearActiveTerminalTimer() {
    if (this.activeTerminalTimer) {
      clearTimeout(this.activeTerminalTimer);
      this.activeTerminalTimer = null;
    }
  }
  _matchesActivePayload(payload) {
    if (!this.activeStreamId) return false;
    if (payload.sessionKey && this.activeSessionKey && payload.sessionKey !== this.activeSessionKey) {
      return false;
    }
    if (payload.runId && this.activeRunId && payload.runId !== this.activeRunId) {
      return false;
    }
    if (payload.runId && !this.activeRunId) {
      this.activeRunId = payload.runId;
    }
    if (payload.sessionKey && !this.activeSessionKey) {
      this.activeSessionKey = payload.sessionKey;
    }
    return true;
  }
  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn("[WsManager] Non-JSON message:", raw.slice(0, 100));
      return;
    }
    console.log("[WsManager] \u2190 msg type=%s event=%s id=%s", msg.type, msg.event ?? "-", msg.id ?? "-");
    if (msg.type === "res") {
      const resp = msg;
      if (!resp.ok && resp.error) {
        const cb = this.pending.get(resp.id);
        if (cb) {
          this.pending.delete(resp.id);
          cb(new Error(resp.error.message));
        }
        return;
      }
      if (resp.ok && resp.payload) {
        const p = resp.payload;
        if (resp.id === this.activeStreamId && typeof p.runId === "string") {
          this.activeRunId = p.runId;
        }
        const content = p.message?.content ?? p.content ?? p.text;
        const text = this._extractText(content);
        if (text) {
          this._clearActiveTerminalTimer();
          console.log("[WsManager] ok-res contains text (%d chars), forwarding as final", text.length);
          const syntheticPayload = {
            state: "final",
            runId: typeof p.runId === "string" ? p.runId : void 0,
            sessionKey: typeof p.sessionKey === "string" ? p.sessionKey : this.activeSessionKey ?? void 0,
            message: { content: [{ type: "text", text }] }
          };
          this.streamCallbacks.forEach((cb) => cb(syntheticPayload));
          this._forwardChatEvent(syntheticPayload);
          if (this.activeStreamId) {
            const cb = this.pending.get(this.activeStreamId);
            if (cb) {
              this.pending.delete(this.activeStreamId);
              cb(null);
            }
            this.activeStreamId = null;
          }
          return;
        }
      }
      return;
    }
    if (msg.type === "event" && msg.event === "chat") {
      const payload = msg.payload;
      console.log(
        "[WsManager] chat event state=%s contentItems=%d",
        payload.state,
        Array.isArray(payload.message?.content) ? payload.message.content.length : 0
      );
      this._forwardChatEvent(payload);
      if (!this._matchesActivePayload(payload)) {
        return;
      }
      const text = this._extractText(payload.message?.content);
      if (text || payload.state === "delta" || payload.state === "error") {
        this._clearActiveTerminalTimer();
      }
      this.streamCallbacks.forEach((cb) => cb(payload));
      if (payload.state === "final" || payload.state === "aborted" || payload.state === "error") {
        if (this.activeStreamId) {
          const finalize = () => {
            if (!this.activeStreamId) return;
            const cb = this.pending.get(this.activeStreamId);
            if (cb) {
              this.pending.delete(this.activeStreamId);
              const err = payload.state === "error" ? new Error(payload.errorMessage || payload.error || "Stream error") : null;
              if (err) {
                console.error("[WsManager] Chat stream error:", err.message);
                reportError("ws", `stream error: ${err.message}`);
              }
              cb(err);
            }
            this.activeStreamId = null;
            this.activeRunId = null;
            this.activeSessionKey = null;
            this._clearActiveTerminalTimer();
          };
          if (payload.state === "final" && !text) {
            this._clearActiveTerminalTimer();
            this.activeTerminalTimer = setTimeout(finalize, 400);
            return;
          }
          finalize();
        }
      }
    }
  }
  _getSessionId(agentId) {
    let sid = this.sessionIds.get(agentId);
    if (!sid) {
      sid = (0, import_crypto.randomUUID)();
      this.sessionIds.set(agentId, sid);
    }
    return sid;
  }
  _forwardChatEvent(payload) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send("chat-stream", payload);
  }
};
var wsManager = new WsManager();

// src/conversation.ts
var path7 = __toESM(require("path"));
var fs6 = __toESM(require("fs"));
function extractTextFromMessageContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const c of content) {
    if (!c) continue;
    if (typeof c === "string") parts.push(c);
    else if (c.type === "text" && c.text) parts.push(String(c.text));
  }
  return parts.join("\n").trim();
}
function normalizeConversationText(role, text) {
  let t = String(text || "").trim();
  if (!t) return t;
  if (role === "user") {
    t = t.replace(/^Conversation info \(untrusted metadata\):\s*```json[\s\S]*?```\s*/i, "").trim();
    t = t.replace(/^\[[A-Za-z]{3}\s+\d{4}-\d{2}-\d{2}[^\]\n]*\]\s*/i, "").trim();
    const marker = "[Current message - respond to this]";
    const idx = t.lastIndexOf(marker);
    if (idx >= 0) t = t.slice(idx + marker.length).trim();
    t = t.replace(/^\s*User\s*:\s*/i, "").trim();
  }
  t = t.replace(/^\s*\[Chat messages since your last reply - for context\][\s\S]*?\[Current message - respond to this\]\s*/i, "");
  t = t.replace(/^\s*User\s*:\s*/i, "").trim();
  return t;
}
function findLatestAssistantReplyAfterUserMessage(conversation, userText) {
  const expectedUserText = normalizeConversationText("user", userText);
  if (!expectedUserText) return "";
  for (let i = conversation.length - 1; i >= 0; i -= 1) {
    const message = conversation[i];
    if (message.role !== "user") continue;
    if (normalizeConversationText("user", message.content) !== expectedUserText) continue;
    for (let j = conversation.length - 1; j > i; j -= 1) {
      const reply = conversation[j];
      if (reply.role !== "assistant") continue;
      const text = normalizeConversationText("assistant", reply.content);
      if (text && text !== "Response received.") {
        return text;
      }
    }
    break;
  }
  return "";
}
function loadAgentConversationFromOpenClaw(agentId = "main", limit = 80) {
  try {
    const sessionsDir = path7.join(OPENCLAW_CONFIG_DIR, "agents", agentId, "sessions");
    if (!fs6.existsSync(sessionsDir)) return [];
    let sessionFiles = [];
    const sessionsIndex = path7.join(sessionsDir, "sessions.json");
    if (fs6.existsSync(sessionsIndex)) {
      const idx = JSON.parse(fs6.readFileSync(sessionsIndex, "utf8").replace(/^\uFEFF/, ""));
      const rows = Object.values(idx || {}).filter((v) => v && v.sessionFile);
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      sessionFiles = rows.map((r) => r.sessionFile).filter((f) => f && fs6.existsSync(f));
    }
    if (!sessionFiles.length) {
      sessionFiles = fs6.readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl")).map((f) => ({ full: path7.join(sessionsDir, f), mtime: fs6.statSync(path7.join(sessionsDir, f)).mtimeMs })).sort((a, b) => b.mtime - a.mtime).map((x) => x.full);
    }
    const conv = [];
    for (const file of sessionFiles) {
      const lines = fs6.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let row;
        try {
          row = JSON.parse(line);
        } catch {
          continue;
        }
        if (row?.type !== "message" || !row.message) continue;
        const role = row.message.role;
        if (role !== "user" && role !== "assistant") continue;
        let text = extractTextFromMessageContent(row.message.content);
        if (!text && row.message.errorMessage) text = row.message.errorMessage;
        if (!text) continue;
        const uiRole = role === "assistant" ? "assistant" : "user";
        text = normalizeConversationText(uiRole, text);
        if (!text) continue;
        conv.push({ role: uiRole, content: text, timestamp: row.timestamp || row.message.timestamp || 0 });
      }
      if (conv.length >= limit * 2) break;
    }
    conv.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return conv.slice(-Math.max(1, limit));
  } catch (e) {
    console.error("[conversation-load] failed:", e.message);
    return [];
  }
}

// src/ipc/chat-ipc.ts
async function recoverGatewayReplyFromTranscript(agentId, userMessage) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
    const recovered = findLatestAssistantReplyAfterUserMessage(conversation, userMessage);
    if (recovered) {
      return recovered;
    }
    await new Promise((resolve5) => setTimeout(resolve5, Math.min(1e3, 200 * (attempt + 1))));
  }
  return "";
}
function registerChatHandlers(getGatewayHandle, getMainWindow2) {
  import_electron3.ipcMain.handle("copy-rich", (_event, payload) => {
    const { text, imagePaths } = payload;
    if (!imagePaths.length) {
      import_electron3.clipboard.writeText(text);
      return true;
    }
    let html = "";
    const lines = text.split("\n");
    for (const line of lines) {
      const imgMatch = line.match(/\/([\w./\-]+\.(?:png|jpg|jpeg|gif|webp|svg))/i);
      if (imgMatch) {
        const fullPath = "/" + imgMatch[1];
        const matched = imagePaths.find((p) => p === fullPath || fullPath.endsWith(p.split("/").pop()));
        if (matched) {
          try {
            const buf = (0, import_fs.readFileSync)(matched);
            const ext = matched.split(".").pop()?.toLowerCase() || "png";
            const mime = ext === "jpg" ? "jpeg" : ext;
            const b64 = buf.toString("base64");
            html += `<p>${line.replace(/`/g, "")}</p><img src="data:image/${mime};base64,${b64}" style="max-width:600px"><br>`;
            continue;
          } catch {
          }
        }
      }
      html += `<p>${line}</p>`;
    }
    try {
      const img = import_electron3.nativeImage.createFromPath(imagePaths[0]);
      import_electron3.clipboard.write({
        text,
        html,
        image: img
      });
    } catch {
      import_electron3.clipboard.write({ text, html });
    }
    return true;
  });
  import_electron3.ipcMain.handle("pick-file", async () => {
    const opts = { properties: ["openFile", "multiSelections"] };
    const win = getMainWindow2();
    const result = win ? await import_electron3.dialog.showOpenDialog(win, opts) : await import_electron3.dialog.showOpenDialog(opts);
    if (result.canceled) return [];
    return result.filePaths;
  });
  import_electron3.ipcMain.handle("send-message", async (_event, payload) => {
    let message = "";
    let agentId = "main";
    let model = "";
    try {
      message = typeof payload === "string" ? payload : payload?.message;
      agentId = payload?.agentId || "main";
      model = payload?.model || "";
      const state = loadAppState();
      const gate = checkPremiumGate(state);
      if (!gate.allow) {
        return {
          success: false,
          premiumRequired: gate.premiumRequired ?? false,
          loginRequired: gate.loginRequired ?? false,
          reason: gate.reason,
          error: gate.message,
          state
        };
      }
      state.conversations = state.conversations || {};
      const conv = state.conversations[agentId] || [];
      const messages = [...conv, { role: "user", content: message }].slice(-20);
      const relay = state.relay;
      const relayAuthToken = relay.accessToken || relay.authToken;
      const hasRelay = !!(relay.baseUrl && relayAuthToken);
      const deviceId = state.deviceId || "";
      const gw = getGatewayHandle();
      const gatewayBaseUrl = gw?.baseUrl || null;
      const gatewayToken = gw?.token || "";
      const freshJwt = await refreshJwtIfNeeded();
      if (freshJwt && freshJwt !== relayAuthToken) {
        await ensureGatewayProviderOrRelay();
      }
      let content;
      if (gatewayBaseUrl) {
        const win = getMainWindow2();
        if (win) wsManager.setWindow(win);
        try {
          content = await wsManager.sendChatMessageStreaming(gatewayBaseUrl, gatewayToken, agentId, message);
        } catch (streamError) {
          const recovered = await recoverGatewayReplyFromTranscript(agentId, message);
          if (recovered) {
            content = recovered;
          } else {
            throw streamError;
          }
        }
        if (!content || content === "Response received.") {
          const recovered = await recoverGatewayReplyFromTranscript(agentId, message);
          if (recovered) {
            content = recovered;
          }
        }
      } else if (hasRelay) {
        content = await sendViaRelay(relay.baseUrl, relayAuthToken, messages, deviceId, model);
      } else if (deviceId && (relay.baseUrl || RELAY_BASE_URL)) {
        content = await sendViaRelay(relay.baseUrl || RELAY_BASE_URL, "", messages, deviceId, model);
      } else {
        throw new Error("No AI provider configured. Please login to use Cloud Relay.");
      }
      state.conversations[agentId] = [...messages, { role: "assistant", content }].slice(-20);
      consumeQuota(state, gate.tier);
      saveAppState(state);
      return { success: true, response: content, state };
    } catch (error) {
      const apiDetail = error?.response?.data?.error?.message || error?.response?.data?.message || error?.response?.data?.error;
      const status = error?.response?.status;
      let msg = apiDetail || error.message || "Unknown error";
      if (status === 500 && /internal error/i.test(msg)) {
        msg = "Gateway provider error. Please verify API Keys (Base URL / API Key / Model) in API Keys page.";
      }
      console.error("[chat] send-message failed:", JSON.stringify({
        status,
        msg,
        url: error?.config?.url,
        responseData: error?.response?.data,
        stack: error.stack?.split("\n").slice(0, 3).join(" | ")
      }));
      reportError("chat", msg, { status, model: payload?.model, agentId: payload?.agentId, stack: error.stack?.split("\n").slice(0, 3) });
      return { success: false, error: `${status ? status + " " : ""}${msg}`, status };
    }
  });
}

// src/ipc/app-state-ipc.ts
var import_electron4 = require("electron");

// src/logger.ts
var fs7 = __toESM(require("fs"));
var path8 = __toESM(require("path"));
var LOG_FILE = path8.join(MYOPENCLAW_DATA_DIR, "myopenclaw.log");
var MAX_LOG_SIZE = 2 * 1024 * 1024;
var logStream = null;
function ensureLogStream() {
  if (logStream) return logStream;
  fs7.mkdirSync(MYOPENCLAW_DATA_DIR, { recursive: true });
  try {
    const stats = fs7.statSync(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const prev = LOG_FILE + ".prev";
      try {
        fs7.unlinkSync(prev);
      } catch {
      }
      fs7.renameSync(LOG_FILE, prev);
    }
  } catch {
  }
  logStream = fs7.createWriteStream(LOG_FILE, { flags: "a" });
  return logStream;
}
function formatLine(level, msg) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  return `${ts} [${level}] ${msg}
`;
}
function initFileLogger() {
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  console.log = (...args) => {
    origLog(...args);
    const msg = args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
    ensureLogStream().write(formatLine("INFO", msg));
  };
  console.error = (...args) => {
    origError(...args);
    const msg = args.map((a) => typeof a === "string" ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)).join(" ");
    ensureLogStream().write(formatLine("ERROR", msg));
  };
  console.warn = (...args) => {
    origWarn(...args);
    const msg = args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
    ensureLogStream().write(formatLine("WARN", msg));
  };
  console.log(`[logger] Logging to ${LOG_FILE}`);
}
function getLogFilePath() {
  return LOG_FILE;
}

// src/ipc/app-state-ipc.ts
function registerAppStateHandlers() {
  import_electron4.ipcMain.handle("get-app-state", async () => {
    const state = loadAppState();
    const gate = checkPremiumGate(state);
    return { ...state, gate };
  });
  import_electron4.ipcMain.handle("get-agent-conversation", async (_event, agentId = "main") => {
    const conversation = loadAgentConversationFromOpenClaw(agentId, 120);
    return { success: true, conversation };
  });
  import_electron4.ipcMain.handle("get-app-version", () => {
    return import_electron4.app.getVersion();
  });
  import_electron4.ipcMain.handle("open-log-file", async () => {
    const logPath = getLogFilePath();
    await import_electron4.shell.openPath(logPath);
    return { success: true, path: logPath };
  });
}

// src/ipc/subscription-ipc.ts
var import_electron5 = require("electron");
var import_axios9 = __toESM(require("axios"));
async function syncSubscriptionFromRelay(state) {
  const relay = state.relay;
  const baseUrl = (relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "");
  const freshJwt = await refreshJwtIfNeeded(baseUrl);
  const currentState = freshJwt ? state : loadAppState();
  const authToken = freshJwt || currentState.relay?.accessToken || currentState.relay?.authToken;
  if (!authToken) return false;
  const headers = {
    Authorization: `Bearer ${authToken}`
  };
  if (state.deviceId) headers["X-Device-Id"] = state.deviceId;
  const response = await import_axios9.default.get(`${baseUrl}/v1/usage`, { headers, timeout: 15e3 });
  const remotePlan = normalizePlan(response.data?.usage?.plan);
  const currentPlan = normalizePlan(state.plan || state.premiumTier);
  if (remotePlan !== currentPlan) {
    applyPlanToState(state, remotePlan);
    saveAppState(state);
  }
  return true;
}
async function getRelayRequestContext(state) {
  const relay = state.relay;
  const baseUrl = (relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "");
  const freshJwt = await refreshJwtIfNeeded(baseUrl);
  const currentState = freshJwt ? state : loadAppState();
  const authToken = freshJwt || currentState.relay?.accessToken || currentState.relay?.authToken;
  if (!authToken) return null;
  const headers = {
    Authorization: `Bearer ${authToken}`
  };
  if (state.deviceId) headers["X-Device-Id"] = state.deviceId;
  return { baseUrl, headers };
}
function registerSubscriptionHandlers() {
  import_electron5.ipcMain.handle("set-user-api-key", async (_event, apiKey) => {
    const state = loadAppState();
    state.userApiKey = (apiKey || "").trim();
    state.userApiKeyQuotaUsed = 0;
    saveAppState(state);
    return { success: true, state };
  });
  import_electron5.ipcMain.handle("set-premium-status", async (_event, isPremium) => {
    const state = loadAppState();
    applyPlanToState(state, isPremium ? "premium" : "free");
    saveAppState(state);
    return { success: true, state };
  });
  import_electron5.ipcMain.handle("set-premium-tier", async (_event, tier) => {
    const state = loadAppState();
    if (!["free", "premium", "pro"].includes(tier)) {
      return { success: false, error: "Invalid tier" };
    }
    applyPlanToState(state, tier);
    saveAppState(state);
    return { success: true, state };
  });
  import_electron5.ipcMain.handle("get-subscription-status", async () => {
    const state = loadAppState();
    try {
      await syncSubscriptionFromRelay(state);
    } catch (e) {
      console.warn("[subscription] relay sync skipped:", e?.message || e);
    }
    const plan = state.plan || state.premiumTier || "free";
    const features = getPlanFeatures(plan);
    return { plan, planExpiresAt: state.planExpiresAt || null, features };
  });
  import_electron5.ipcMain.handle("get-referral-summary", async () => {
    const state = loadAppState();
    const ctx = await getRelayRequestContext(state);
    if (!ctx) {
      return { success: false, error: "not_authenticated" };
    }
    try {
      const response = await import_axios9.default.get(`${ctx.baseUrl}/v1/referral`, { headers: ctx.headers, timeout: 15e3 });
      return { success: true, referral: response.data?.referral || null };
    } catch (error) {
      return {
        success: false,
        error: error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to load referral summary"
      };
    }
  });
  import_electron5.ipcMain.handle("generate-referral-code", async () => {
    const state = loadAppState();
    const ctx = await getRelayRequestContext(state);
    if (!ctx) {
      return { success: false, error: "not_authenticated" };
    }
    try {
      const response = await import_axios9.default.post(`${ctx.baseUrl}/v1/referral/generate`, {}, { headers: ctx.headers, timeout: 15e3 });
      return { success: true, referral: response.data?.referral || null };
    } catch (error) {
      return {
        success: false,
        error: error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to generate referral code"
      };
    }
  });
  import_electron5.ipcMain.handle("create-checkout-session", async (_event, data) => {
    const { plan } = data || {};
    if (!plan || !["free", "premium", "pro"].includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }
    const state = loadAppState();
    applyPlanToState(state, plan, null);
    saveAppState(state);
    return { success: true, mock: true };
  });
  import_electron5.ipcMain.handle("activate-subscription", async (_event, data) => {
    const { plan, expiresAt } = data || {};
    if (!plan || !["free", "premium", "pro"].includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }
    const state = loadAppState();
    applyPlanToState(state, plan, expiresAt || null);
    saveAppState(state);
    return { success: true };
  });
}

// src/ipc/agent-ipc.ts
var crypto5 = __toESM(require("crypto"));
var import_electron6 = require("electron");

// src/soul.ts
var fs8 = __toESM(require("fs"));
var path9 = __toESM(require("path"));
function getAgentWorkspaceDir(agentId) {
  if (agentId === "main") return GATEWAY_WORKSPACE_DIR;
  return path9.join(OPENCLAW_CONFIG_DIR, `workspace-${agentId}`);
}
function buildSoulMdContent(customSoul) {
  const parts = [SYSTEM_SOUL];
  if (customSoul && customSoul.trim()) {
    parts.push(`
## Agent Personality

${customSoul.trim()}`);
  }
  return parts.join("\n") + "\n";
}
function writeAgentSoulMd(agentId, customSoul) {
  const wsDir = getAgentWorkspaceDir(agentId);
  if (!fs8.existsSync(wsDir)) {
    fs8.mkdirSync(wsDir, { recursive: true });
  }
  const soulPath = path9.join(wsDir, "SOUL.md");
  fs8.writeFileSync(soulPath, buildSoulMdContent(customSoul), "utf8");
}
function removeAgentWorkspace(agentId) {
  if (agentId === "main") return;
  const wsDir = getAgentWorkspaceDir(agentId);
  if (fs8.existsSync(wsDir)) {
    fs8.rmSync(wsDir, { recursive: true, force: true });
  }
}
function copyMainAuthToAgent(agentId) {
  if (agentId === "main") return;
  const targetDir = path9.join(OPENCLAW_CONFIG_DIR, "agents", agentId, "agent");
  fs8.mkdirSync(targetDir, { recursive: true });
  for (const file of ["auth.json", "auth-profiles.json"]) {
    const src = path9.join(AUTH_PROFILES_DIR, file);
    const dst = path9.join(targetDir, file);
    if (fs8.existsSync(src)) {
      fs8.copyFileSync(src, dst);
    }
  }
}
function registerAgentInGatewayConfig(agentId) {
  try {
    const cfg = fs8.existsSync(CONFIG_FILE) ? JSON.parse(fs8.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    cfg.agents = cfg.agents || {};
    cfg.agents.list = cfg.agents.list || [];
    const exists = cfg.agents.list.some((a) => a.id === agentId);
    if (!exists) {
      const entry = { id: agentId };
      if (agentId !== "main") {
        entry.workspace = getAgentWorkspaceDir(agentId);
      }
      cfg.agents.list.push(entry);
    }
    const dir = path9.dirname(CONFIG_FILE);
    if (!fs8.existsSync(dir)) fs8.mkdirSync(dir, { recursive: true });
    fs8.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
  } catch (e) {
    console.error("[soul] registerAgentInGatewayConfig failed:", e.message);
  }
}
function unregisterAgentFromGatewayConfig(agentId) {
  try {
    if (!fs8.existsSync(CONFIG_FILE)) return;
    const cfg = JSON.parse(fs8.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, ""));
    if (!cfg.agents?.list) return;
    cfg.agents.list = cfg.agents.list.filter((a) => a.id !== agentId);
    fs8.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
  } catch (e) {
    console.error("[soul] unregisterAgentFromGatewayConfig failed:", e.message);
  }
}
function ensureMainAgentSoul() {
  const wsDir = GATEWAY_WORKSPACE_DIR;
  if (!fs8.existsSync(wsDir)) {
    fs8.mkdirSync(wsDir, { recursive: true });
  }
  const soulPath = path9.join(wsDir, "SOUL.md");
  if (!fs8.existsSync(soulPath)) {
    fs8.writeFileSync(soulPath, buildSoulMdContent(void 0), "utf8");
    return;
  }
  const existing = fs8.readFileSync(soulPath, "utf8");
  if (!existing.includes("## System Rules")) {
    fs8.writeFileSync(soulPath, SYSTEM_SOUL + "\n\n" + existing, "utf8");
  }
}

// src/ipc/agent-ipc.ts
function registerAgentHandlers() {
  import_electron6.ipcMain.handle("list-agents", async () => {
    const state = loadAppState();
    return state.agents;
  });
  import_electron6.ipcMain.handle("add-agent", async (_event, data) => {
    const state = loadAppState();
    const plan = state.plan || state.premiumTier || "free";
    const features = getPlanFeatures(plan);
    const totalAgents = state.agents.length;
    if (features.maxAgents !== -1 && totalAgents >= features.maxAgents) {
      return { error: "upgrade_required", message: "Upgrade to add more agents" };
    }
    const name = (typeof data === "string" ? data : data?.name) || `Agent ${state.agents.length + 1}`;
    const newAgent = { id: crypto5.randomUUID(), name, channels: [] };
    state.agents.push(newAgent);
    state.activeAgentId = newAgent.id;
    saveAppState(state);
    writeAgentSoulMd(newAgent.id, void 0);
    registerAgentInGatewayConfig(newAgent.id);
    copyMainAuthToAgent(newAgent.id);
    syncAgentModelRegistries();
    return newAgent;
  });
  import_electron6.ipcMain.handle("rename-agent", async (_event, payload) => {
    const state = loadAppState();
    const agentId = payload.agentId || payload.id;
    if (agentId === "main") return { success: false, error: "Cannot rename main agent" };
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: "Agent not found" };
    agent.name = payload.name || agent.name;
    saveAppState(state);
    return { success: true, agents: state.agents };
  });
  import_electron6.ipcMain.handle("set-agent-channels", async (_event, payload) => {
    const state = loadAppState();
    const agent = state.agents.find((a) => a.id === payload.id);
    if (!agent) return { success: false, error: "Agent not found" };
    agent.channels = Array.isArray(payload.channels) ? payload.channels : [];
    saveAppState(state);
    return { success: true, agents: state.agents };
  });
  import_electron6.ipcMain.handle("delete-agent", async (_event, agentId) => {
    const state = loadAppState();
    if (agentId === "main") return { success: false, error: "Main agent cannot be deleted" };
    const index = state.agents.findIndex((a) => a.id === agentId);
    if (index < 0) return { success: false, error: "Agent not found" };
    state.agents.splice(index, 1);
    if (state.activeAgentId === agentId) state.activeAgentId = "main";
    if (state.conversations) delete state.conversations[agentId];
    saveAppState(state);
    removeAgentWorkspace(agentId);
    unregisterAgentFromGatewayConfig(agentId);
    return { success: true, agents: state.agents, state };
  });
  import_electron6.ipcMain.handle("set-active-agent", async (_event, id) => {
    const state = loadAppState();
    if (!state.agents.find((a) => a.id === id)) return { success: false, error: "Agent not found" };
    state.activeAgentId = id;
    saveAppState(state);
    return { success: true, state };
  });
  import_electron6.ipcMain.handle("get-agent-soul", async (_event, agentId) => {
    const state = loadAppState();
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: "Agent not found" };
    return { success: true, soul: agent.soul || "" };
  });
  import_electron6.ipcMain.handle("set-agent-soul", async (_event, payload) => {
    const state = loadAppState();
    const agent = state.agents.find((a) => a.id === payload.agentId);
    if (!agent) return { success: false, error: "Agent not found" };
    agent.soul = payload.soul || void 0;
    saveAppState(state);
    writeAgentSoulMd(payload.agentId, agent.soul);
    return { success: true };
  });
}

// src/ipc/provider-ipc.ts
var fs9 = __toESM(require("fs"));
var import_electron7 = require("electron");
function registerProviderHandlers(getGatewayHandle, onStartGateway) {
  import_electron7.ipcMain.handle("save-provider-config", async (_event, payload) => {
    try {
      const { providerId = "default", baseUrl = "", apiKey = "", api = "", modelId = "default" } = payload || {};
      const cleanProviderId = String(providerId || "").trim();
      const cleanModelId = String(modelId || "").trim();
      const autoApi = String(api || "").trim() || "openai-completions";
      if (!cleanProviderId) return { success: false, error: "Provider Name is required" };
      if (!cleanModelId) return { success: false, error: "Model Name is required" };
      if (!String(apiKey || "").trim()) return { success: false, error: "API Key is required" };
      const cfg = loadEmbeddedConfig();
      cfg.models = cfg.models || {};
      cfg.models.mode = cfg.models.mode || "merge";
      cfg.models.providers = cfg.models.providers || {};
      cfg.models.providers[cleanProviderId] = {
        ...cfg.models.providers[cleanProviderId] || {},
        baseUrl,
        apiKey,
        api: autoApi,
        models: [{ id: cleanModelId, name: cleanModelId }]
      };
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      cfg.agents.defaults.model = cfg.agents.defaults.model || {};
      cfg.agents.defaults.model.primary = `${cleanProviderId}/${cleanModelId}`;
      if (cfg.agents.defaults.model.fallback !== void 0) delete cfg.agents.defaults.model.fallback;
      saveEmbeddedConfig(cfg);
      syncAuthProfileForProvider(cleanProviderId, apiKey, autoApi);
      syncAgentModelRegistries();
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) {
        try {
          if (!fs9.existsSync(CONFIG_FILE)) {
            fs9.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
            const gatewayConfig = {
              gateway: { auth: { mode: "token" }, http: { endpoints: { chatCompletions: { enabled: true } } } },
              models: {
                mode: "merge",
                providers: {
                  [cleanProviderId]: {
                    baseUrl: baseUrl || void 0,
                    apiKey,
                    api: autoApi,
                    models: [{ id: cleanModelId, name: cleanModelId }]
                  }
                }
              }
            };
            fs9.writeFileSync(CONFIG_FILE, JSON.stringify(gatewayConfig, null, 2));
            console.log("[save-provider] Created gateway config, starting gateway...");
          }
          await onStartGateway();
        } catch (gwErr) {
          console.error("[save-provider] Gateway start failed:", gwErr.message);
        }
      }
      return { success: true, apiResolved: autoApi, modelResolved: `${cleanProviderId}/${cleanModelId}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("get-provider-config", async () => {
    try {
      const cfg = loadEmbeddedConfig();
      const providers = cfg?.models?.providers || {};
      const entries = Object.entries(providers);
      if (entries.length) {
        const [providerId, p] = entries[0];
        if (String(p?.apiKey || "").trim()) {
          return {
            success: true,
            configured: true,
            provider: {
              providerId,
              modelId: p?.models?.[0]?.id || "default",
              api: p?.api || "openai-completions",
              baseUrl: p?.baseUrl || "",
              apiKey: p?.apiKey || ""
            }
          };
        }
      }
      const state = loadAppState();
      const hasRelay = !!(state.deviceToken || state.deviceId);
      return { success: true, configured: hasRelay };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("delete-provider-config", async (_event, providerId) => {
    try {
      const cfg = loadEmbeddedConfig();
      cfg.models = cfg.models || {};
      cfg.models.providers = cfg.models.providers || {};
      const id = String(providerId || "").trim();
      if (id && cfg.models.providers[id]) delete cfg.models.providers[id];
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      cfg.agents.defaults.model = cfg.agents.defaults.model || {};
      cfg.agents.defaults.model.primary = "openclaw:main";
      if (cfg.agents.defaults.model.fallback !== void 0) delete cfg.agents.defaults.model.fallback;
      saveEmbeddedConfig(cfg);
      syncAgentModelRegistries();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("reset-model-config", async () => {
    try {
      const cfg = loadEmbeddedConfig();
      cfg.models = { mode: "merge", providers: {} };
      cfg.agents = cfg.agents || {};
      cfg.agents.defaults = cfg.agents.defaults || {};
      if (cfg.agents.defaults.model !== void 0) delete cfg.agents.defaults.model;
      saveEmbeddedConfig(cfg);
      fs9.mkdirSync(AUTH_PROFILES_DIR, { recursive: true });
      fs9.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify({ version: 1, profiles: {}, lastGood: {}, usageStats: {} }, null, 2), "utf8");
      syncAgentModelRegistries();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("save-config", async (_event, config) => {
    try {
      if (!fs9.existsSync(OPENCLAW_CONFIG_DIR)) {
        fs9.mkdirSync(OPENCLAW_CONFIG_DIR, { recursive: true });
      }
      const providerId = config.provider === "openai" ? "openai" : "anthropic";
      const modelId = config.provider === "openai" ? "gpt-4" : "claude-3-5-sonnet-20241022";
      const openclawConfig = {
        gateway: { auth: { mode: "token" }, http: { endpoints: { chatCompletions: { enabled: true } } } },
        models: {
          mode: "merge",
          providers: {
            [providerId]: {
              apiKey: config.apiKey,
              baseUrl: config.baseUrl || void 0,
              api: "openai-completions",
              models: [{ id: modelId, name: modelId }]
            }
          }
        }
      };
      fs9.writeFileSync(CONFIG_FILE, JSON.stringify(openclawConfig, null, 2));
      syncAgentModelRegistries();
      await onStartGateway();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// src/ipc/relay-ipc.ts
var import_electron8 = require("electron");
var import_axios10 = __toESM(require("axios"));
function registerRelayHandlers() {
  import_electron8.ipcMain.handle("save-relay-config", async (_event, config) => {
    try {
      const { baseUrl = "", authToken = "" } = config || {};
      const state = loadAppState();
      state.relay = { ...state.relay, baseUrl: baseUrl.trim(), authToken: authToken.trim() };
      saveAppState(state);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("get-relay-config", async () => {
    try {
      const state = loadAppState();
      return { success: true, relay: state.relay };
    } catch (e) {
      const defaultRelay = getDefaultAppState().relay;
      return { success: false, error: e.message, relay: defaultRelay };
    }
  });
  import_electron8.ipcMain.handle("test-relay-connection", async () => {
    try {
      const state = loadAppState();
      const baseUrl = state.relay?.baseUrl || RELAY_BASE_URL;
      const freshJwt = await refreshJwtIfNeeded(baseUrl);
      const currentState = freshJwt ? state : loadAppState();
      const authToken = freshJwt || currentState.relay?.accessToken || currentState.relay?.authToken;
      const deviceId = state.deviceId || "";
      if (!authToken && deviceId) {
        await checkRelayHealth(baseUrl, "");
        return { success: true, guest: true };
      }
      if (!authToken) {
        return { success: false, error: "Auth token is required. Please log in first." };
      }
      await checkRelayHealth(baseUrl, authToken);
      return { success: true };
    } catch (e) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
      return { success: false, error: detail };
    }
  });
  import_electron8.ipcMain.handle("open-login", async () => {
    try {
      const state = loadAppState();
      const deviceId = state.deviceId || "";
      const homepageUrl = "https://myopenclaws.app";
      const loginUrl = `${homepageUrl}/login?deviceId=${deviceId}&redirect=myopenclaw`;
      await import_electron8.shell.openExternal(loginUrl);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron8.ipcMain.handle("save-relay-auth", async (_event, { accessToken, refreshToken }) => {
    try {
      const state = loadAppState();
      state.relay.accessToken = accessToken || "";
      state.relay.refreshToken = refreshToken || "";
      saveAppState(state);
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("get-models", async () => {
    try {
      const state = loadAppState();
      const baseUrl = (state.relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "");
      const headers = {};
      const jwt = state.relay?.accessToken || state.relay?.authToken;
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
      if (state.deviceId) headers["X-Device-Id"] = state.deviceId;
      const requestUrl = `${baseUrl}/v1/models`;
      const res = await import_axios10.default.get(requestUrl, { headers, timeout: 1e4 });
      const models = res.data?.data || [];
      return { success: true, models };
    } catch (e) {
      await logDnsDiagnostics("relay-models-ipc", e, `${(loadAppState().relay?.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "")}/v1/models`);
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e.message;
      return { success: false, error: msg, models: [] };
    }
  });
  import_electron8.ipcMain.handle("logout", async () => {
    try {
      const state = loadAppState();
      state.relay.accessToken = "";
      state.relay.refreshToken = "";
      state.relay.userEmail = "";
      saveAppState(state);
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/device-ipc.ts
var import_electron9 = require("electron");
var import_axios11 = __toESM(require("axios"));
function registerDeviceHandlers() {
  import_electron9.ipcMain.handle("get-device-id", async () => {
    const state = loadAppState();
    return { success: true, deviceId: state.deviceId || "" };
  });
  import_electron9.ipcMain.handle("check-quota", async () => {
    const state = loadAppState();
    const relay = state.relay;
    const deviceId = state.deviceId;
    const baseUrl = (relay.baseUrl || RELAY_BASE_URL).replace(/\/+$/, "");
    const authToken = relay.accessToken || relay.authToken;
    if (!authToken && !deviceId) {
      return { success: false, error: "not_configured" };
    }
    try {
      const headers = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      if (deviceId) headers["X-Device-Id"] = deviceId;
      const requestUrl = `${baseUrl}/v1/usage`;
      const response = await import_axios11.default.get(requestUrl, { headers, timeout: 2e4 });
      return response.data;
    } catch (err) {
      await logDnsDiagnostics("device-quota-check", err, `${baseUrl}/v1/usage`);
      return { success: false, error: err.message };
    }
  });
}

// src/ipc/channel-ipc.ts
var fs10 = __toESM(require("fs"));
var path10 = __toESM(require("path"));
var import_electron10 = require("electron");
var import_axios12 = __toESM(require("axios"));
function maskToken(token) {
  if (!token || token.length <= 12) return "****";
  const prefix = token.slice(0, 10);
  const suffix = token.slice(-10);
  return prefix + "****" + suffix;
}
var botNameCache = /* @__PURE__ */ new Map();
var telegramTargetLabelCache = /* @__PURE__ */ new Map();
function normalizeAllowFromList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}
function mergePairedTargets(...lists) {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const list of lists) {
    for (const id of list) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push({ id });
    }
  }
  return merged;
}
async function fetchTelegramBotName(botToken) {
  const cacheKey = botToken.slice(-10);
  const cached = botNameCache.get(cacheKey);
  if (cached !== void 0) return cached;
  try {
    const res = await import_axios12.default.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 5e3 });
    const name = res.data?.result?.username || "";
    botNameCache.set(cacheKey, name);
    return name;
  } catch {
    botNameCache.set(cacheKey, "");
    return "";
  }
}
async function fetchTelegramTargetLabel(botToken, targetId) {
  const normalizedId = String(targetId || "").trim();
  if (!botToken || !normalizedId) return {};
  const cacheKey = botToken.slice(-10) + ":" + normalizedId;
  const cached = telegramTargetLabelCache.get(cacheKey);
  if (cached !== void 0) return cached;
  try {
    const res = await import_axios12.default.get(`https://api.telegram.org/bot${botToken}/getChat`, {
      timeout: 5e3,
      params: { chat_id: normalizedId }
    });
    const result = res.data?.result || {};
    const username = result.username ? String(result.username).trim() : "";
    const firstName = result.first_name ? String(result.first_name).trim() : "";
    const lastName = result.last_name ? String(result.last_name).trim() : "";
    const title = result.title ? String(result.title).trim() : "";
    const label = username ? `@${username}` : title || [firstName, lastName].filter(Boolean).join(" ").trim() || normalizedId;
    const data = {
      label,
      username: username || void 0
    };
    telegramTargetLabelCache.set(cacheKey, data);
    return data;
  } catch {
    const fallback = { label: normalizedId };
    telegramTargetLabelCache.set(cacheKey, fallback);
    return fallback;
  }
}
function syncChannelsToGatewayConfig(channels) {
  try {
    const ocCfg = fs10.existsSync(CONFIG_FILE) ? JSON.parse(fs10.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
    ocCfg.channels = { ...ocCfg.channels || {}, ...channels };
    fs10.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
    console.log("[channel-ipc] Synced channels to openclaw.json");
  } catch (e) {
    console.error("[channel-ipc] Failed to sync channels:", e.message);
  }
}
function registerChannelHandlers() {
  import_electron10.ipcMain.handle("save-agent-channel-config", async (_event, payload) => {
    try {
      const { agentId, channelType, configJson } = payload || {};
      const parsed = configJson ? JSON.parse(configJson) : {};
      const cfg = loadEmbeddedConfig();
      cfg.channels = cfg.channels || {};
      cfg.channels[channelType] = cfg.channels[channelType] || { enabled: true, accounts: {} };
      cfg.channels[channelType].enabled = true;
      cfg.channels[channelType].accounts = cfg.channels[channelType].accounts || {};
      cfg.channels[channelType].accounts[agentId || "default"] = parsed;
      saveEmbeddedConfig(cfg);
      syncChannelsToGatewayConfig(cfg.channels);
      await ensureGatewayProviderOrRelay();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("get-channel-status", async () => {
    try {
      const cfg = loadEmbeddedConfig();
      const channels = {};
      const cfgChannels = cfg.channels || {};
      const credDir = path10.join(OPENCLAW_CONFIG_DIR, "credentials");
      for (const [channelType, channelCfg] of Object.entries(cfgChannels)) {
        const ch = channelCfg;
        if (!ch.accounts || !Object.keys(ch.accounts).length) continue;
        const accounts = {};
        const pairedUsers = {};
        for (const [accountId, accountCfg] of Object.entries(ch.accounts)) {
          const masked = { ...accountCfg || {} };
          for (const key of ["botToken", "token", "apiKey"]) {
            if (typeof masked[key] === "string" && masked[key].length > 0) {
              masked[`_raw_${key}`] = masked[key];
              masked[key] = maskToken(masked[key]);
            }
          }
          if (channelType === "telegram" && accountCfg?.botToken) {
            const botName = await fetchTelegramBotName(accountCfg.botToken);
            if (botName) masked._botName = botName;
          }
          accounts[accountId] = masked;
          const configAllowFrom = normalizeAllowFromList(accountCfg?.allowFrom);
          let fileAllowFrom = [];
          const allowFile = path10.join(credDir, `${channelType}-${accountId}-allowFrom.json`);
          try {
            if (fs10.existsSync(allowFile)) {
              const data = JSON.parse(fs10.readFileSync(allowFile, "utf8"));
              fileAllowFrom = normalizeAllowFromList(data.allowFrom);
            }
          } catch {
          }
          const mergedPairedUsers = mergePairedTargets(configAllowFrom, fileAllowFrom);
          if (mergedPairedUsers.length) {
            if (channelType === "telegram" && typeof accountCfg?.botToken === "string" && accountCfg.botToken) {
              pairedUsers[accountId] = await Promise.all(
                mergedPairedUsers.map(async (entry) => ({
                  id: entry.id,
                  ...await fetchTelegramTargetLabel(accountCfg.botToken, entry.id)
                }))
              );
            } else {
              pairedUsers[accountId] = mergedPairedUsers;
            }
          }
        }
        channels[channelType] = {
          enabled: ch.enabled !== false,
          accounts,
          pairedUsers
        };
      }
      return { success: true, channels };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/skills-ipc.ts
var crypto6 = __toESM(require("crypto"));
var fs11 = __toESM(require("fs"));
var os5 = __toESM(require("os"));
var path11 = __toESM(require("path"));
var import_child_process4 = require("child_process");
var import_electron11 = require("electron");
function findBundledClawHubCliScript() {
  try {
    const packageJsonPath = require.resolve("clawhub/package.json");
    const packageDir = path11.dirname(packageJsonPath);
    const pkg = JSON.parse(fs11.readFileSync(packageJsonPath, "utf8"));
    const binEntry = typeof pkg?.bin === "string" ? pkg.bin : typeof pkg?.bin?.clawhub === "string" ? pkg.bin.clawhub : typeof pkg?.bin?.clawdhub === "string" ? pkg.bin.clawdhub : null;
    if (!binEntry) return null;
    const scriptPath = path11.resolve(packageDir, binEntry);
    return fs11.existsSync(scriptPath) ? scriptPath : null;
  } catch {
    return null;
  }
}
function findClawHubCli() {
  const candidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process4.execFileSync)(cmd, ["clawhub"], {
      encoding: "utf8",
      timeout: 3e3,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath()
      }
    }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os5.homedir();
  const nvmDir = path11.join(home, ".nvm", "versions", "node");
  try {
    if (fs11.existsSync(nvmDir)) {
      const versions = fs11.readdirSync(nvmDir).filter((v) => v.startsWith("v")).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path11.join(nvmDir, ver, "bin", "clawhub"));
      }
    }
  } catch {
  }
  const binNames = process.platform === "win32" ? ["clawhub.cmd", "clawhub.exe", "clawhub"] : ["clawhub"];
  for (const bin of binNames) {
    candidates.push(path11.join(DOWNLOADED_RUNTIME_DIR, "openclaw-deps", ".bin", bin));
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path11.join(home, "AppData", "Roaming");
    for (const bin of binNames) {
      candidates.push(path11.join(appData, "npm", bin));
    }
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    for (const bin of binNames) {
      candidates.push(path11.join(pf, "nodejs", bin));
    }
  }
  candidates.push(
    "/usr/local/bin/clawhub",
    "/opt/homebrew/bin/clawhub"
  );
  const seen = /* @__PURE__ */ new Set();
  for (const p of candidates) {
    const resolved = path11.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs11.existsSync(p)) return p;
  }
  return null;
}
function hasCommandOnHost(command) {
  try {
    if (process.platform === "win32") {
      if (command === "go" && fs11.existsSync(getManagedGoCliPath())) return true;
      if (command === "uv" && fs11.existsSync(getManagedUvCliPath())) return true;
    }
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process4.execFileSync)(cmd, [command], {
      encoding: "utf8",
      timeout: 3e3,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath()
      }
    }).trim();
    return Boolean(result);
  } catch {
    return false;
  }
}
function findNpmCli() {
  const candidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process4.execFileSync)(cmd, ["npm"], {
      encoding: "utf8",
      timeout: 3e3,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath()
      }
    }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os5.homedir();
  const nvmDir = path11.join(home, ".nvm", "versions", "node");
  try {
    if (fs11.existsSync(nvmDir)) {
      const versions = fs11.readdirSync(nvmDir).filter((v) => v.startsWith("v")).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
      for (const ver of versions) {
        candidates.push(path11.join(nvmDir, ver, "bin", process.platform === "win32" ? "npm.cmd" : "npm"));
      }
    }
  } catch {
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path11.join(home, "AppData", "Roaming");
    candidates.push(path11.join(appData, "npm", "npm.cmd"));
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    candidates.push(path11.join(pf, "nodejs", "npm.cmd"));
    candidates.push(path11.join(pf, "nodejs", "npm"));
    candidates.push(path11.join(__dirname, "resources", "node", "npm.cmd"));
    candidates.push(path11.join(DOWNLOADED_RUNTIME_DIR, "node", "npm.cmd"));
  } else {
    candidates.push("/usr/local/bin/npm");
    candidates.push("/opt/homebrew/bin/npm");
  }
  const seen = /* @__PURE__ */ new Set();
  for (const p of candidates) {
    const resolved = path11.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs11.existsSync(p)) return p;
  }
  return null;
}
function getInstallPrereqMessage(installOpts) {
  const preferred = Array.isArray(installOpts) && installOpts.length > 0 ? installOpts[0] : null;
  const kind = typeof preferred?.kind === "string" ? preferred.kind : "";
  const label = typeof preferred?.label === "string" ? preferred.label.trim() : "";
  if (!kind) return null;
  if (process.platform === "win32") {
    const supportedKinds = /* @__PURE__ */ new Set(["node", "go", "uv", "download"]);
    if (!supportedKinds.has(kind)) return null;
    if (kind === "go" || kind === "uv") return null;
  }
  if (kind === "brew" && !findBrewCli()) {
    return process.platform === "linux" ? `Automatic setup for ${label || "this skill"} needs Homebrew. Install Homebrew from https://brew.sh or install the package manually on the gateway host.` : `Automatic setup for ${label || "this skill"} needs Homebrew. Install it from https://brew.sh and try again.`;
  }
  if (kind === "node" && !findNpmCli()) {
    return `Automatic setup for ${label || "this skill"} needs Node.js/npm on the gateway host. Install Node.js and try again.`;
  }
  if (kind === "uv" && !hasCommandOnHost("uv") && !findBrewCli()) {
    return `Automatic setup for ${label || "this skill"} needs uv. Install uv manually, or install Homebrew first so the gateway can install uv for you.`;
  }
  if (kind === "go" && !hasCommandOnHost("go")) {
    const canAutoInstallGo = findBrewCli() || process.platform === "linux" && hasCommandOnHost("apt-get");
    if (!canAutoInstallGo) {
      return `Automatic setup for ${label || "this skill"} needs Go on the gateway host. Install Go manually and try again.`;
    }
  }
  return null;
}
function getUnsupportedInstallMessage(installOpts) {
  const preferred = Array.isArray(installOpts) && installOpts.length > 0 ? installOpts[0] : null;
  const kind = typeof preferred?.kind === "string" ? preferred.kind : "";
  const label = typeof preferred?.label === "string" ? preferred.label.trim() : "";
  if (!kind) return null;
  if (process.platform === "win32") {
    const supportedKinds = /* @__PURE__ */ new Set(["node", "go", "uv", "download"]);
    if (!supportedKinds.has(kind)) {
      return `Automatic setup for ${label || "this skill"} is not available on Windows in MyOpenClaw. Install the dependency manually on the gateway host first.`;
    }
  }
  return null;
}
function execFileAsync2(cmd, args, opts = {}) {
  return new Promise((resolve5, reject) => {
    (0, import_child_process4.execFile)(cmd, args, {
      encoding: "utf8",
      windowsHide: true,
      ...opts
    }, (err, stdout, stderr) => {
      const stdoutText = typeof stdout === "string" ? stdout : stdout?.toString("utf8") || "";
      const stderrText = typeof stderr === "string" ? stderr : stderr?.toString("utf8") || "";
      if (err) {
        reject(new Error(stderrText || stdoutText || err.message));
        return;
      }
      resolve5(stdoutText);
    });
  });
}
function getManagedGoCliPath() {
  return path11.join(MANAGED_TOOLS_DIR, "go", "bin", "go.exe");
}
function getManagedUvCliPath() {
  return path11.join(MANAGED_TOOLS_DIR, "uv", "uv.exe");
}
function findFileRecursive(baseDir, targetFile, maxDepth = 6) {
  if (!fs11.existsSync(baseDir)) return null;
  const queue = [{ dir: baseDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    let entries = [];
    try {
      entries = fs11.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path11.join(current.dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === targetFile.toLowerCase()) {
        return fullPath;
      }
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      }
    }
  }
  return null;
}
async function extractZipArchive(zipPath, targetDir) {
  fs11.mkdirSync(targetDir, { recursive: true });
  await execFileAsync2("tar", ["-xf", zipPath, "-C", targetDir], {
    env: {
      ...process.env,
      PATH: buildNodeEnhancedPath()
    }
  });
}
async function resolveLatestGoDownloadUrl() {
  const arch2 = process.arch === "arm64" ? "arm64" : "amd64";
  const response = await fetch("https://go.dev/dl/?mode=json");
  if (!response.ok) {
    throw new Error(`Failed to query latest Go release (HTTP ${response.status})`);
  }
  const releases = await response.json();
  for (const release of releases) {
    if (release?.stable === false) continue;
    const files = Array.isArray(release?.files) ? release.files : [];
    const match = files.find((file) => file?.os === "windows" && file?.arch === arch2 && file?.kind === "archive" && typeof file?.filename === "string" && file.filename.endsWith(".zip"));
    if (match && typeof match.filename === "string") {
      return `https://go.dev/dl/${match.filename}`;
    }
  }
  throw new Error(`Could not find a Go zip archive for Windows ${arch2}`);
}
function getLatestUvDownloadUrl() {
  const arch2 = process.arch === "arm64" ? "aarch64-pc-windows-msvc" : "x86_64-pc-windows-msvc";
  return `https://github.com/astral-sh/uv/releases/latest/download/uv-${arch2}.zip`;
}
async function ensureManagedWindowsGo() {
  const goCli = getManagedGoCliPath();
  if (fs11.existsSync(goCli)) return goCli;
  fs11.mkdirSync(MANAGED_TOOLS_DIR, { recursive: true });
  const zipPath = path11.join(os5.tmpdir(), `myopenclaw-go-${process.arch}.zip`);
  const installRoot = path11.join(MANAGED_TOOLS_DIR, "go");
  try {
    const downloadUrl = await resolveLatestGoDownloadUrl();
    await downloadFile(downloadUrl, zipPath);
    fs11.rmSync(installRoot, { recursive: true, force: true });
    await extractZipArchive(zipPath, MANAGED_TOOLS_DIR);
  } finally {
    try {
      fs11.unlinkSync(zipPath);
    } catch {
    }
  }
  if (!fs11.existsSync(goCli)) {
    throw new Error("Go download completed, but go.exe was not found in the managed tools directory.");
  }
  return goCli;
}
async function ensureManagedWindowsUv() {
  const uvCli = getManagedUvCliPath();
  if (fs11.existsSync(uvCli)) return uvCli;
  fs11.mkdirSync(MANAGED_TOOLS_DIR, { recursive: true });
  const zipPath = path11.join(os5.tmpdir(), `myopenclaw-uv-${process.arch}.zip`);
  const installRoot = path11.join(MANAGED_TOOLS_DIR, "uv");
  try {
    await downloadFile(getLatestUvDownloadUrl(), zipPath);
    fs11.rmSync(installRoot, { recursive: true, force: true });
    fs11.mkdirSync(installRoot, { recursive: true });
    await extractZipArchive(zipPath, installRoot);
    const extractedUv = findFileRecursive(installRoot, "uv.exe");
    if (!extractedUv) {
      throw new Error("uv download completed, but uv.exe was not found in the extracted archive.");
    }
    if (path11.resolve(extractedUv) !== path11.resolve(uvCli)) {
      fs11.copyFileSync(extractedUv, uvCli);
    }
    const extractedUvx = findFileRecursive(installRoot, "uvx.exe");
    if (extractedUvx) {
      const uvxCli = path11.join(installRoot, "uvx.exe");
      if (path11.resolve(extractedUvx) !== path11.resolve(uvxCli)) {
        fs11.copyFileSync(extractedUvx, uvxCli);
      }
    }
  } finally {
    try {
      fs11.unlinkSync(zipPath);
    } catch {
    }
  }
  if (!fs11.existsSync(uvCli)) {
    throw new Error("uv download completed, but uv.exe was not found in the managed tools directory.");
  }
  return uvCli;
}
async function ensureWindowsSkillPrereq(installSpec) {
  if (process.platform !== "win32" || !installSpec || typeof installSpec !== "object") return;
  const kind = typeof installSpec.kind === "string" ? installSpec.kind : "";
  if (kind === "go" && !hasCommandOnHost("go")) {
    await ensureManagedWindowsGo();
    return;
  }
  if (kind === "uv" && !hasCommandOnHost("uv")) {
    await ensureManagedWindowsUv();
  }
}
function findBrewCli() {
  const candidates = [];
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = (0, import_child_process4.execFileSync)(cmd, ["brew"], {
      encoding: "utf8",
      timeout: 3e3,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: buildNodeEnhancedPath()
      }
    }).trim();
    if (result) candidates.push(result.split(/\r?\n/)[0]);
  } catch {
  }
  const home = os5.homedir();
  candidates.push(
    "/opt/homebrew/bin/brew",
    "/usr/local/bin/brew",
    path11.join(home, ".linuxbrew", "bin", "brew"),
    path11.join(home, "homebrew", "bin", "brew")
  );
  const seen = /* @__PURE__ */ new Set();
  for (const p of candidates) {
    const resolved = path11.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs11.existsSync(p)) return p;
  }
  return null;
}
function installClawHubCli() {
  return new Promise((resolve5, reject) => {
    console.log("[skills] clawhub not found, auto-installing via npm...");
    const npmCmd = findNpmCli();
    if (!npmCmd) {
      reject(new Error("Failed to auto-install clawhub: npm was not found. Install Node.js/npm or install clawhub manually."));
      return;
    }
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(npmCmd);
    (0, import_child_process4.execFile)(npmCmd, ["install", "-g", "clawhub"], {
      timeout: 12e4,
      encoding: "utf8",
      shell: useShell ? true : void 0,
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (err) {
        console.error("[skills] clawhub install failed:", stderr || err.message);
        reject(new Error("Failed to auto-install clawhub: " + formatSkillServiceError(stderr || stdout || err.message)));
      } else {
        console.log("[skills] clawhub installed successfully");
        const bin = findClawHubCli();
        if (bin) resolve5(bin);
        else reject(new Error("clawhub installed but binary not found in PATH"));
      }
    });
  });
}
function runClawHubCli(args) {
  const bundledScript = findBundledClawHubCliScript();
  console.log("[marketplace] clawhub start", JSON.stringify(args));
  if (bundledScript) {
    console.log("[marketplace] clawhub using bundled script", bundledScript);
    return runClawHubCliWithBundledScript(bundledScript, args);
  }
  let bin = findClawHubCli();
  if (!bin) {
    return installClawHubCli().then((installedBin) => runClawHubCliWithBin(installedBin, args));
  }
  return runClawHubCliWithBin(bin, args);
}
function sleep(ms) {
  return new Promise((resolve5) => setTimeout(resolve5, ms));
}
function summarizeCommandText(value) {
  const text = typeof value === "string" ? value : String(value || "");
  const normalized = stripAnsi(text).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 400 ? `${normalized.slice(0, 399)}\u2026` : normalized;
}
function isRateLimitedError(error) {
  const lower = stripAnsi(error instanceof Error ? error.message : String(error || "")).toLowerCase();
  return lower.includes("rate limit exceeded") || lower.includes("rate limited") || lower.includes("http 429") || lower.includes("too many requests");
}
function parseRetryDelayMs(error) {
  const message = stripAnsi(error instanceof Error ? error.message : String(error || ""));
  const match = message.match(/retry in\s*([0-9]+(?:\.[0-9]+)?)s/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.max(1e3, Math.ceil(seconds * 1e3));
}
async function runClawHubCliWithRetry(args, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await runClawHubCli(args);
    } catch (e) {
      if (!isRateLimitedError(e) || attempt >= maxRetries) throw e;
      const delayMs = parseRetryDelayMs(e) ?? 1500;
      attempt += 1;
      console.warn(`[marketplace] clawhub rate limited, retrying in ${delayMs}ms (${attempt}/${maxRetries})`);
      await sleep(delayMs);
    }
  }
}
function runClawHubCliWithBundledScript(scriptPath, args) {
  return new Promise((resolve5, reject) => {
    (0, import_child_process4.execFile)(process.execPath, [scriptPath, ...args], {
      timeout: 12e4,
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
      }
    }, (err, stdout, stderr) => {
      const stdoutSummary = summarizeCommandText(stdout);
      const stderrSummary = summarizeCommandText(stderr);
      if (stdoutSummary) console.log("[marketplace] clawhub stdout", stdoutSummary);
      if (stderrSummary) console.warn("[marketplace] clawhub stderr", stderrSummary);
      if (err) {
        console.error("[marketplace] clawhub failed", err.message);
        reject(new Error(stderr || stdout || err.message));
      } else {
        console.log("[marketplace] clawhub completed");
        resolve5(stdout);
      }
    });
  });
}
function runClawHubCliWithBin(bin, args) {
  const useShell = process.platform === "win32";
  return new Promise((resolve5, reject) => {
    (0, import_child_process4.execFile)(bin, args, {
      timeout: 12e4,
      encoding: "utf8",
      shell: useShell ? true : void 0,
      windowsHide: true
    }, (err, stdout, stderr) => {
      const stdoutSummary = summarizeCommandText(stdout);
      const stderrSummary = summarizeCommandText(stderr);
      if (stdoutSummary) console.log("[marketplace] clawhub stdout", stdoutSummary);
      if (stderrSummary) console.warn("[marketplace] clawhub stderr", stderrSummary);
      if (err) {
        console.error("[marketplace] clawhub failed", err.message);
        reject(new Error(stderr || stdout || err.message));
      } else {
        console.log("[marketplace] clawhub completed");
        resolve5(stdout);
      }
    });
  });
}
async function gatewayRpc(gw, method, params = {}) {
  const id = crypto6.randomUUID();
  const token = readGatewayTokenFromConfig();
  const wsUrl = gw.baseUrl.replace(/^http/, "ws") + "/ws";
  return new Promise((resolve5, reject) => {
    let WS;
    try {
      WS = global.WebSocket || require("ws");
    } catch {
      WS = require("ws");
    }
    const socket = new WS(wsUrl, {
      headers: {
        ...token ? { Authorization: `Bearer ${token}` } : {}
      }
    });
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
      }
      reject(new Error(`Gateway RPC timeout for method "${method}"`));
    }, 15e3);
    let connected = false;
    let challengeNonce = null;
    const connectId = crypto6.randomUUID();
    const reqMsg = JSON.stringify({ type: "req", id, method, params });
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        if (msg.type === "event" && msg.event === "connect.challenge") {
          challengeNonce = msg.payload?.nonce;
          socket.send(JSON.stringify({
            type: "req",
            id: connectId,
            method: "connect",
            params: buildConnectParams(token, challengeNonce)
          }));
          return;
        }
        if (msg.type === "event") return;
        if (!connected) {
          if (msg.type === "res" && msg.id === connectId && msg.ok) {
            connected = true;
            handleConnectResponse(msg.payload);
            socket.send(reqMsg);
            return;
          }
        }
        if (msg.id !== id) return;
        clearTimeout(timer);
        socket.close();
        if (msg.ok) {
          resolve5(msg.payload);
        } else {
          const errMsg = typeof msg.error === "object" ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `Gateway RPC error for "${method}"`));
        }
      } catch (e) {
        clearTimeout(timer);
        socket.close();
        reject(e);
      }
    };
    socket.onerror = (err) => {
      clearTimeout(timer);
      reject(new Error(`Gateway WebSocket error: ${err.message || String(err)}`));
    };
  });
}
async function getGatewaySkillsStatus(gw) {
  const payload = await gatewayRpc(gw, "skills.status", {});
  return Array.isArray(payload?.skills) ? payload.skills : Array.isArray(payload) ? payload : [];
}
async function waitForGatewaySkill(gw, skillKey, attempts = 6) {
  for (let i = 0; i < attempts; i += 1) {
    const skills = await getGatewaySkillsStatus(gw);
    const skill = skills.find((item) => item?.skillKey === skillKey || item?.name === skillKey);
    if (skill) return skill;
    if (i < attempts - 1) {
      await new Promise((resolve5) => setTimeout(resolve5, 500));
    }
  }
  return null;
}
async function resolveGatewayInstallTarget(gw, skillKey, requestedInstallId) {
  const skill = await waitForGatewaySkill(gw, skillKey);
  if (!skill) {
    if (requestedInstallId) return { name: skillKey, installId: requestedInstallId, installSpec: null };
    throw new Error(`Skill not found: ${skillKey}`);
  }
  const resolvedName = typeof skill?.name === "string" && skill.name.trim().length > 0 ? skill.name.trim() : typeof skill?.skillKey === "string" && skill.skillKey.trim().length > 0 ? skill.skillKey.trim() : skillKey;
  const installOpts = Array.isArray(skill?.install) ? skill.install : [];
  const installSpec = requestedInstallId ? installOpts.find((opt) => typeof opt?.id === "string" && opt.id.trim() === requestedInstallId) || null : installOpts.find((opt) => typeof opt?.id === "string" && opt.id.trim().length > 0) || null;
  if (requestedInstallId) {
    return { name: resolvedName, installId: requestedInstallId, installSpec };
  }
  const installId = typeof installSpec?.id === "string" ? installSpec.id.trim() : "";
  if (!installId) return null;
  return { name: resolvedName, installId, installSpec };
}
async function installGatewaySkill(gw, skillKey, requestedInstallId) {
  const target = await resolveGatewayInstallTarget(gw, skillKey, requestedInstallId);
  if (!target) {
    console.log("[marketplace] no gateway installer for skill", skillKey);
    return false;
  }
  console.log("[marketplace] gateway install target", JSON.stringify(target));
  await ensureWindowsSkillPrereq(target.installSpec);
  await gatewayRpc(gw, "skills.install", {
    name: target.name,
    installId: target.installId,
    timeoutMs: 6e4
  });
  return true;
}
function summarizeMissingRequirements(skill) {
  const missing = skill?.missing || {};
  const parts = [];
  if (Array.isArray(missing.bins) && missing.bins.length > 0) parts.push(`bins: ${missing.bins.join(", ")}`);
  if (Array.isArray(missing.env) && missing.env.length > 0) parts.push(`env: ${missing.env.join(", ")}`);
  if (Array.isArray(missing.config) && missing.config.length > 0) parts.push(`config: ${missing.config.join(", ")}`);
  return parts.length > 0 ? parts.join(" | ") : null;
}
function formatMarketplaceHttpError(resp) {
  if (resp.status === 429) {
    const retryAfter = resp.headers.get("retry-after");
    return retryAfter ? `Skill marketplace is temporarily rate limited. Please try again in ${retryAfter} seconds.` : "Skill marketplace is temporarily rate limited. Please wait a moment and try again.";
  }
  return `HTTP ${resp.status}`;
}
function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}
function formatSkillServiceError(error) {
  const raw = error instanceof Error ? error.message : String(error || "unknown");
  const message = stripAnsi(raw).replace(/\s+/g, " ").trim();
  const lower = message.toLowerCase();
  if (lower.includes("http 429") || lower.includes("rate limited") || lower.includes("rate limit exceeded") || lower.includes("too many requests")) {
    return "Skill service is temporarily busy. Please wait a moment and try again.";
  }
  return message;
}
function formatMarketplaceError(error) {
  const message = formatSkillServiceError(error);
  if (message.includes("HTTP 429")) {
    return "Skill marketplace is temporarily rate limited. Please wait a moment and try again.";
  }
  return message;
}
function clampMarketplaceLimit(limit) {
  const value = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(value) || value <= 0) return 25;
  return Math.max(1, Math.min(50, Math.floor(value)));
}
function normalizeMarketplaceSort(sort) {
  switch (String(sort || "").trim()) {
    case "downloads":
      return "downloads";
    case "updated":
      return "newest";
    case "stars":
      return "stars";
    case "installs":
      return "installs";
    case "name":
      return "name";
    case "newest":
      return "newest";
    // The desktop UI still exposes "Trending"; the public page no longer does.
    // Fallback to downloads so this tab remains useful instead of failing.
    case "trending":
      return "downloads";
    default:
      return "stars";
  }
}
function normalizeMarketplaceConvexEntry(entry) {
  const skill = entry?.skill;
  if (!skill || typeof skill.slug !== "string") return null;
  const latestVersion = entry?.latestVersion && typeof entry.latestVersion === "object" ? {
    version: typeof entry.latestVersion.version === "string" ? entry.latestVersion.version : "",
    createdAt: Number(entry.latestVersion.createdAt || 0),
    changelog: typeof entry.latestVersion.changelog === "string" ? entry.latestVersion.changelog : "",
    license: entry.latestVersion.license ?? null
  } : void 0;
  return {
    slug: skill.slug,
    displayName: typeof skill.displayName === "string" && skill.displayName.trim() ? skill.displayName : skill.slug,
    summary: typeof skill.summary === "string" ? skill.summary : null,
    tags: skill.tags ?? null,
    stats: skill.stats ?? {},
    createdAt: Number(skill.createdAt || 0),
    updatedAt: Number(skill.updatedAt || 0),
    latestVersion
  };
}
async function fetchMarketplaceListViaConvex(sort, cursor, limit) {
  const args = {
    dir: "desc",
    highlightedOnly: false,
    nonSuspiciousOnly: false,
    numItems: clampMarketplaceLimit(limit),
    sort: normalizeMarketplaceSort(sort)
  };
  if (typeof cursor === "string" && cursor.trim()) args.cursor = cursor;
  const resp = await fetch("https://wry-manatee-359.convex.cloud/api/query", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: "skills:listPublicPageV4",
      format: "convex_encoded_json",
      args: [args]
    })
  });
  if (!resp.ok) throw new Error(formatMarketplaceHttpError(resp));
  const data = await resp.json();
  const page = Array.isArray(data?.value?.page) ? data.value.page : [];
  const items = page.map((entry) => normalizeMarketplaceConvexEntry(entry)).filter((entry) => Boolean(entry));
  const nextCursor = typeof data?.value?.nextCursor === "string" ? data.value.nextCursor : null;
  return { items, nextCursor };
}
function normalizeMarketplaceDetailViaConvex(data) {
  const value = data?.value ?? {};
  const skill = value?.skill ?? null;
  const latestVersion = value?.latestVersion ?? null;
  const owner = value?.owner ?? null;
  return {
    skill: skill ? {
      slug: typeof skill.slug === "string" ? skill.slug : "",
      displayName: typeof skill.displayName === "string" ? skill.displayName : typeof skill.slug === "string" ? skill.slug : "",
      summary: typeof skill.summary === "string" ? skill.summary : null,
      tags: skill.tags ?? null,
      stats: skill.stats ?? {},
      createdAt: Number(skill.createdAt || 0),
      updatedAt: Number(skill.updatedAt || 0)
    } : null,
    latestVersion: latestVersion ? {
      version: typeof latestVersion.version === "string" ? latestVersion.version : "",
      createdAt: Number(latestVersion.createdAt || 0),
      changelog: typeof latestVersion.changelog === "string" ? latestVersion.changelog : "",
      license: latestVersion.license ?? null
    } : null,
    metadata: {
      os: latestVersion?.parsed?.clawdis?.os ?? null,
      systems: latestVersion?.parsed?.clawdis?.systems ?? null
    },
    owner: owner ? {
      handle: typeof owner.handle === "string" ? owner.handle : null,
      userId: typeof owner._id === "string" ? owner._id : null,
      displayName: typeof owner.displayName === "string" ? owner.displayName : null,
      image: typeof owner.image === "string" ? owner.image : null
    } : null,
    moderation: value?.moderationInfo ?? null,
    canonical: value?.canonical ?? null,
    forkOf: value?.forkOf ?? null,
    pendingReview: Boolean(value?.pendingReview),
    requestedSlug: typeof value?.requestedSlug === "string" ? value.requestedSlug : null,
    resolvedSlug: typeof value?.resolvedSlug === "string" ? value.resolvedSlug : null
  };
}
async function fetchMarketplaceDetailViaConvex(slug) {
  const resp = await fetch("https://wry-manatee-359.convex.cloud/api/query", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: "skills:getBySlug",
      format: "convex_encoded_json",
      args: [{ slug }]
    })
  });
  if (!resp.ok) throw new Error(formatMarketplaceHttpError(resp));
  const data = await resp.json();
  return normalizeMarketplaceDetailViaConvex(data);
}
function registerSkillsHandlers(getGatewayHandle) {
  import_electron11.ipcMain.handle("skills-list", async () => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running", skills: [] };
      const payload = await gatewayRpc(gw, "skills.status", {});
      const skills = Array.isArray(payload?.skills) ? payload.skills : Array.isArray(payload) ? payload : [];
      let enabledKeys = /* @__PURE__ */ new Set();
      try {
        const cfg = JSON.parse(fs11.readFileSync(CONFIG_FILE, "utf8"));
        const entries = cfg?.skills?.entries || {};
        for (const [key, val] of Object.entries(entries)) {
          if (val && val.enabled) enabledKeys.add(key);
        }
      } catch {
      }
      for (const s of skills) {
        s.enabled = enabledKeys.has(s.skillKey);
        const installOpts = Array.isArray(s.install) ? s.install : [];
        s.installUnsupportedMessage = getUnsupportedInstallMessage(installOpts);
        s.installPrereqMessage = getInstallPrereqMessage(installOpts);
      }
      return { success: true, skills };
    } catch (e) {
      return { success: false, error: e.message, skills: [] };
    }
  });
  import_electron11.ipcMain.handle("skills-toggle", async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running" };
      const { skillKey, enabled } = payload || {};
      if (!skillKey) return { success: false, error: "skillKey is required" };
      await gatewayRpc(gw, "skills.update", { skillKey, enabled: !!enabled });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("skills-install", async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running" };
      const { name, installId } = payload || {};
      if (!name) return { success: false, error: "name is required" };
      await installGatewaySkill(gw, String(name), typeof installId === "string" ? installId : void 0);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("skills-install-deps", async (_event, payload) => {
    const { bins } = payload || {};
    if (!Array.isArray(bins) || bins.length === 0) {
      return { success: true, installed: [] };
    }
    const safeBins = bins.filter((b) => /^[a-zA-Z0-9_-]+$/.test(b));
    if (safeBins.length === 0) {
      return { success: false, error: "No valid package names" };
    }
    const brewCmd = findBrewCli();
    if (!brewCmd) {
      return {
        success: false,
        error: "Homebrew was not found. Install Homebrew first, then try again.",
        results: safeBins.map((bin) => ({ bin, ok: false, error: "brew not found" }))
      };
    }
    const brewBinDir = path11.dirname(brewCmd);
    const envPath = process.env.PATH?.includes(brewBinDir) ? buildNodeEnhancedPath() : `${brewBinDir}${path11.delimiter}${buildNodeEnhancedPath()}`;
    const results = [];
    for (const bin of safeBins) {
      try {
        await new Promise((resolve5, reject) => {
          (0, import_child_process4.execFile)(brewCmd, ["install", bin], {
            timeout: 12e4,
            env: {
              ...process.env,
              PATH: envPath
            }
          }, (err, stdout, stderr) => {
            if (err) reject(new Error(stderr || stdout || err.message));
            else resolve5();
          });
        });
        results.push({ bin, ok: true });
      } catch (e) {
        results.push({ bin, ok: false, error: e.message });
      }
    }
    const allOk = results.every((r) => r.ok);
    return { success: allOk, results };
  });
  const CLAWHUB_API = "https://clawhub.ai/api/v1";
  import_electron11.ipcMain.handle("marketplace-list", async (_event, payload) => {
    try {
      const { sort, cursor, limit } = payload || {};
      const data = await fetchMarketplaceListViaConvex(sort, cursor, limit);
      return { success: true, items: data.items, nextCursor: data.nextCursor };
    } catch (e) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });
  import_electron11.ipcMain.handle("marketplace-search", async (_event, payload) => {
    try {
      const { query, limit } = payload || {};
      if (!query) return { success: false, error: "query is required" };
      const params = new URLSearchParams({ q: query, limit: String(limit || 15) });
      const resp = await fetch(`${CLAWHUB_API}/search?${params}`);
      if (!resp.ok) return { success: false, error: formatMarketplaceHttpError(resp) };
      const data = await resp.json();
      return { success: true, results: data.results || [] };
    } catch (e) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });
  import_electron11.ipcMain.handle("marketplace-detail", async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug) return { success: false, error: "slug is required" };
      try {
        const data = await fetchMarketplaceDetailViaConvex(slug);
        return { success: true, ...data };
      } catch {
        const resp = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`);
        if (!resp.ok) return { success: false, error: formatMarketplaceHttpError(resp) };
        const data = await resp.json();
        return { success: true, ...data };
      }
    } catch (e) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });
  import_electron11.ipcMain.handle("marketplace-install", async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: "Invalid slug" };
      console.log("[marketplace] install requested", slug);
      await runClawHubCliWithRetry([
        "install",
        slug,
        "--workdir",
        GATEWAY_WORKSPACE_DIR,
        "--no-input",
        "--force"
      ]);
      console.log("[marketplace] skill downloaded", slug);
      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        await installGatewaySkill(gw, slug);
        const gatewaySkill = await waitForGatewaySkill(gw, slug);
        const autoEnable = gatewaySkill?.eligible !== false;
        if (autoEnable) {
          try {
            await gatewayRpc(gw, "skills.update", { skillKey: slug, enabled: true });
            console.log("[marketplace] skill enabled", slug);
          } catch {
          }
        } else {
          console.log("[marketplace] skill downloaded but still blocked", slug, summarizeMissingRequirements(gatewaySkill) || "unknown reason");
          return {
            success: true,
            enabled: false,
            warning: summarizeMissingRequirements(gatewaySkill) || "Skill downloaded, but it is still blocked."
          };
        }
      }
      console.log("[marketplace] install completed", slug);
      return { success: true, enabled: true };
    } catch (e) {
      console.error("[marketplace] install failed", e);
      return { success: false, error: formatMarketplaceError(e) };
    }
  });
  import_electron11.ipcMain.handle("marketplace-uninstall", async (_event, payload) => {
    try {
      const { slug } = payload || {};
      if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return { success: false, error: "Invalid slug" };
      const gw = getGatewayHandle();
      if (gw?.baseUrl) {
        try {
          await gatewayRpc(gw, "skills.update", { skillKey: slug, enabled: false });
        } catch {
        }
      }
      try {
        await runClawHubCli([
          "uninstall",
          slug,
          "--workdir",
          GATEWAY_WORKSPACE_DIR,
          "--no-input"
        ]);
      } catch (clawErr) {
        const msg = clawErr.message || "";
        if (msg.includes("Not installed") || msg.includes("not found")) {
          console.log(`[marketplace] ${slug} not a clawhub package, disabled via gateway only`);
        } else {
          throw clawErr;
        }
      }
      try {
        const ocCfg = fs11.existsSync(CONFIG_FILE) ? JSON.parse(fs11.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "")) : {};
        if (ocCfg.skills?.entries?.[slug]) {
          delete ocCfg.skills.entries[slug];
          fs11.writeFileSync(CONFIG_FILE, JSON.stringify(ocCfg, null, 2), "utf8");
          console.log(`[marketplace] Removed ${slug} from skills.entries`);
        }
      } catch {
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: formatMarketplaceError(e) };
    }
  });
  import_electron11.ipcMain.handle("skills-configure", async (_event, payload) => {
    try {
      const gw = getGatewayHandle();
      if (!gw?.baseUrl) return { success: false, error: "Gateway not running" };
      const { skillKey, apiKey, env } = payload || {};
      if (!skillKey) return { success: false, error: "skillKey is required" };
      const params = { skillKey };
      if (apiKey !== void 0) params.apiKey = apiKey;
      if (env !== void 0) params.env = env;
      await gatewayRpc(gw, "skills.update", params);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/ipc/cron-ipc.ts
var crypto7 = __toESM(require("crypto"));
var fs12 = __toESM(require("fs"));
var path12 = __toESM(require("path"));
var import_axios13 = __toESM(require("axios"));
var import_electron12 = require("electron");
function wsRpc(port, token, method, params = {}) {
  return new Promise((resolve5, reject) => {
    const id = crypto7.randomUUID();
    const reqMsg = JSON.stringify({ type: "req", id, method, params });
    let ws;
    try {
      const WebSocket2 = require("ws");
      ws = new WebSocket2(`ws://127.0.0.1:${port}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch {
      reject(new Error("WebSocket (ws) module not available"));
      return;
    }
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
      }
      reject(new Error(`cron RPC timeout: ${method}`));
    }, 1e4);
    let connected = false;
    let challengeNonce = null;
    const connectId = crypto7.randomUUID();
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(typeof data === "string" ? data : data.toString("utf8"));
        if (msg.type === "event" && msg.event === "connect.challenge") {
          challengeNonce = msg.payload?.nonce;
          ws.send(JSON.stringify({
            type: "req",
            id: connectId,
            method: "connect",
            params: buildConnectParams(token, challengeNonce)
          }));
          return;
        }
        if (msg.type === "event") return;
        if (!connected) {
          if (msg.type === "res" && msg.id === connectId && msg.ok) {
            connected = true;
            handleConnectResponse(msg.payload);
            ws.send(reqMsg);
            return;
          }
        }
        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.close();
        if (msg.ok) {
          resolve5(msg.payload);
        } else {
          const errMsg = typeof msg.error === "object" ? msg.error?.message : msg.error;
          reject(new Error(errMsg || `RPC error: ${method}`));
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
function normalizeExplicitDelivery(raw) {
  if (!raw || typeof raw !== "object") return null;
  const mode = String(raw.mode || "").trim();
  if (!mode || mode === "none") return { mode: "none" };
  if (mode !== "announce") return null;
  const channel = String(raw.channel || "").trim().toLowerCase();
  let to = String(raw.to || "").trim();
  if (!channel || !to) return null;
  const prefix = `${channel}:`;
  if (!to.toLowerCase().startsWith(prefix) && !/^[a-z0-9_-]+:/i.test(to)) {
    to = `${prefix}${to}`;
  }
  return { mode: "announce", channel, to };
}
function validateCronConfig(config) {
  if (config.schedule.kind === "at") {
    const atMs = Date.parse(config.schedule.at);
    if (!Number.isFinite(atMs)) {
      throw new Error("Invalid timestamp");
    }
    if (atMs < Date.now()) {
      throw new Error("Generated timestamp is in the past. Please review the schedule.");
    }
  }
  return config;
}
function slugifyCronName(input) {
  const slug = String(input || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug || "scheduled-task";
}
function detectRequestedChannel(input) {
  const text = String(input || "").toLowerCase();
  if (!text) return null;
  const patterns = [
    ["telegram", /\btelegram\b|\btg\b|电报/],
    ["discord", /\bdiscord\b/],
    ["slack", /\bslack\b/],
    ["whatsapp", /\bwhatsapp\b|\bwa\b/],
    ["signal", /\bsignal\b/],
    ["imessage", /\bimessage\b|\bi-message\b/]
  ];
  for (const [channel, pattern] of patterns) {
    if (pattern.test(text)) return channel;
  }
  return null;
}
function loadSessionsIndex(agentId) {
  try {
    const file = path12.join(OPENCLAW_CONFIG_DIR, "agents", agentId, "sessions", "sessions.json");
    if (!fs12.existsSync(file)) return {};
    return JSON.parse(fs12.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return {};
  }
}
function findLatestChannelRoute(agentId, requestedChannel) {
  const rows = Object.entries(loadSessionsIndex(agentId)).map(([sessionKey, entry]) => ({ sessionKey, entry })).sort((a, b) => Number(b.entry?.updatedAt || 0) - Number(a.entry?.updatedAt || 0));
  for (const row of rows) {
    const channel = String(
      row.entry?.deliveryContext?.channel || row.entry?.lastChannel || row.entry?.channel || ""
    ).trim().toLowerCase();
    const to = String(
      row.entry?.deliveryContext?.to || row.entry?.lastTo || ""
    ).trim();
    if (channel !== requestedChannel) continue;
    if (!to || to === "heartbeat") continue;
    return {
      sessionKey: row.sessionKey,
      channel,
      to
    };
  }
  return null;
}
function resolveCronRouting(agentId, hintText) {
  const requestedChannel = detectRequestedChannel(hintText);
  if (requestedChannel) {
    const route = findLatestChannelRoute(agentId, requestedChannel);
    if (route) {
      return {
        sessionKey: route.sessionKey,
        delivery: {
          mode: "announce",
          channel: route.channel,
          to: route.to
        }
      };
    }
  }
  return {
    delivery: { mode: "none" }
  };
}
function applyCronRouting(params, hintText, explicitDelivery) {
  const normalized = { ...params };
  const patch = normalized.patch && typeof normalized.patch === "object" ? { ...normalized.patch } : null;
  const agentId = String(
    normalized.agentId || patch?.agentId || "main"
  );
  const routing = explicitDelivery ? { delivery: explicitDelivery } : resolveCronRouting(agentId, hintText);
  if (patch) {
    patch.agentId = agentId;
    patch.delivery = routing.delivery;
    if (routing.sessionKey) patch.sessionKey = routing.sessionKey;
    else delete patch.sessionKey;
    normalized.patch = patch;
  } else {
    normalized.agentId = agentId;
    normalized.delivery = routing.delivery;
    if (routing.sessionKey) normalized.sessionKey = routing.sessionKey;
    else delete normalized.sessionKey;
  }
  return normalized;
}
function normalizeCronConfig(rawConfig, fallbackDescription) {
  const schedule = rawConfig?.schedule || {};
  const kind = schedule?.kind;
  let normalizedSchedule;
  if (kind === "cron") {
    const expr = String(schedule.expr || "").trim();
    if (!expr) throw new Error("Missing cron expression");
    const tz = String(schedule.tz || "").trim();
    normalizedSchedule = tz ? { kind: "cron", expr, tz } : { kind: "cron", expr };
  } else if (kind === "every") {
    const everyMs = Number(schedule.everyMs);
    if (!Number.isFinite(everyMs) || everyMs < 1e3) throw new Error("Missing interval");
    normalizedSchedule = { kind: "every", everyMs };
  } else if (kind === "at") {
    const at = String(schedule.at || "").trim();
    if (!at) throw new Error("Missing timestamp");
    normalizedSchedule = { kind: "at", at };
  } else {
    throw new Error("Missing schedule kind");
  }
  const description = String(fallbackDescription || "").trim();
  return validateCronConfig({
    name: slugifyCronName(String(rawConfig?.name || "").trim() || description),
    schedule: normalizedSchedule,
    message: String(rawConfig?.message || "").trim() || description
  });
}
function parseCronConfig(content, fallbackDescription) {
  const cleaned = String(content || "").replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  if (!cleaned) return null;
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    return normalizeCronConfig(parsed, fallbackDescription);
  } catch {
    return null;
  }
}
async function requestCronConfig(port, token, messages, options = {}) {
  const body = {
    model: "openclaw:main",
    messages,
    stream: false,
    temperature: 0
  };
  if (options.toolChoice) body.tool_choice = options.toolChoice;
  const response = await import_axios13.default.post(`http://127.0.0.1:${port}/v1/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    timeout: 3e4
  });
  return String(response?.data?.choices?.[0]?.message?.content || "").trim();
}
function extractJobId(job) {
  return String(job?.jobId || job?.id || "").trim();
}
async function listCronJobs(port, token) {
  const payload = await wsRpc(port, token, "cron.list", {});
  return Array.isArray(payload?.jobs) ? payload.jobs : [];
}
async function detectNewCronJobs(port, token, beforeIds) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const jobs = await listCronJobs(port, token);
    const created = jobs.filter((job) => {
      const id = extractJobId(job);
      return id && !beforeIds.has(id);
    });
    if (created.length) return created;
    if (attempt < 2) {
      await new Promise((resolve5) => setTimeout(resolve5, 250 * (attempt + 1)));
    }
  }
  return [];
}
function registerCronHandlers(getGatewayHandle) {
  function requireGateway() {
    const gw = getGatewayHandle();
    if (!gw) throw new Error("Gateway is not running");
    return { port: gw.port, token: gw.token };
  }
  import_electron12.ipcMain.handle("cron-list", async () => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.list", {});
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron12.ipcMain.handle("cron-add", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const hintText = String(params?.payload?.message || "");
      const delivery = normalizeExplicitDelivery(params?.delivery);
      const payload = await wsRpc(port, token, "cron.add", applyCronRouting(params, hintText, delivery));
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron12.ipcMain.handle("cron-update", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const patch = params?.patch || {};
      const hintText = String(patch?.payload?.message || "");
      const explicitDelivery = normalizeExplicitDelivery(patch?.delivery);
      const shouldApplyRouting = !!(hintText || patch.agentId || patch.payload || patch.sessionTarget || patch.delivery);
      const payload = await wsRpc(
        port,
        token,
        "cron.update",
        shouldApplyRouting ? applyCronRouting(params, hintText, explicitDelivery) : params
      );
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron12.ipcMain.handle("cron-remove", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.remove", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron12.ipcMain.handle("cron-run", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.run", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron12.ipcMain.handle("cron-runs", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const payload = await wsRpc(port, token, "cron.runs", params);
      return { success: true, ...payload };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron12.ipcMain.handle("cron-generate", async (_event, params) => {
    try {
      const { port, token } = requireGateway();
      const beforeJobs = await listCronJobs(port, token);
      const beforeJobIds = new Set(beforeJobs.map((job) => extractJobId(job)).filter(Boolean));
      const agentId = String(params?.agentId || "main");
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const systemPrompt = [
        "You are a cron job configuration assistant.",
        "If the user is clearly asking to create or schedule a cron job, use the available cron tools to create it directly.",
        "If you successfully create the cron job, reply with a brief confirmation only.",
        "If you cannot safely create it directly, parse the user's natural language description into a structured cron job config.",
        `Current time: ${nowIso}`,
        "Never claim the job is already created unless the cron tool actually succeeded.",
        "Never return a past timestamp when the user asks for a future reminder or schedule.",
        "Return ONLY valid JSON (no markdown fences, no explanation) with this structure:",
        "{",
        '  "name": "short-kebab-case-name",',
        '  "schedule": {',
        '    "kind": "cron" | "every" | "at",',
        '    "expr": "cron expression (only when kind=cron, e.g. 0 9 * * *)",',
        '    "tz": "optional timezone like Asia/Shanghai (only when kind=cron)",',
        '    "everyMs": 60000 (only when kind=every, milliseconds)',
        '    "at": "2026-03-15T09:00:00Z (only when kind=at, ISO timestamp)"',
        "  },",
        '  "message": "the prompt message to send to the agent when the job runs"',
        "}"
      ].join("\n");
      const content = await requestCronConfig(port, token, [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.description }
      ]);
      if (!content) {
        return { success: false, error: "AI returned empty response" };
      }
      const createdJobs = await detectNewCronJobs(port, token, beforeJobIds);
      if (createdJobs.length) {
        const routedJobs = [];
        const routing = normalizeExplicitDelivery(params?.delivery) ? { delivery: normalizeExplicitDelivery(params?.delivery) } : resolveCronRouting(agentId, params.description);
        for (const job of createdJobs) {
          const id = extractJobId(job);
          if (!id) {
            routedJobs.push(job);
            continue;
          }
          try {
            const updated = await wsRpc(port, token, "cron.update", {
              id,
              patch: {
                agentId,
                sessionKey: routing.sessionKey,
                delivery: routing.delivery
              }
            });
            routedJobs.push(updated);
          } catch {
            routedJobs.push(job);
          }
        }
        return {
          success: true,
          created: true,
          jobs: routedJobs,
          assistantReply: content
        };
      }
      const directConfig = parseCronConfig(content, params.description);
      if (directConfig) {
        return { success: true, config: directConfig };
      }
      const repairPrompt = [
        "You convert scheduling requests into structured cron job JSON.",
        "The assistant reply may be a plain English confirmation instead of JSON.",
        "Infer the correct schedule from the original request and the assistant reply.",
        `Current time: ${nowIso}`,
        "Never claim the job is already created.",
        "Never return a past timestamp when the request implies a future schedule.",
        "Return ONLY valid JSON with this structure:",
        "{",
        '  "name": "short-kebab-case-name",',
        '  "schedule": {',
        '    "kind": "cron" | "every" | "at",',
        '    "expr": "cron expression when kind=cron",',
        '    "tz": "optional timezone like Asia/Shanghai",',
        '    "everyMs": 60000,',
        '    "at": "2026-03-15T09:00:00Z"',
        "  },",
        '  "message": "the prompt to send when the job runs"',
        "}"
      ].join("\n");
      const repairedContent = await requestCronConfig(port, token, [
        { role: "system", content: repairPrompt },
        {
          role: "user",
          content: [
            "Original request:",
            params.description,
            "",
            "Assistant reply:",
            content
          ].join("\n")
        }
      ], { toolChoice: "none" });
      const repairedConfig = parseCronConfig(repairedContent, params.description);
      if (repairedConfig) {
        return { success: true, config: repairedConfig, normalizedFromReply: true };
      }
      return { success: false, error: content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// src/ipc/pairing-ipc.ts
var fs13 = __toESM(require("fs"));
var path13 = __toESM(require("path"));
var import_electron13 = require("electron");
var CREDENTIALS_DIR = path13.join(OPENCLAW_CONFIG_DIR, "credentials");
function getPairingFilePath(channel) {
  return path13.join(CREDENTIALS_DIR, `${channel}-pairing.json`);
}
function getAllowFromFilePath(channel, accountId) {
  return path13.join(CREDENTIALS_DIR, `${channel}-${accountId}-allowFrom.json`);
}
function readPairingFile(channel) {
  const filePath = getPairingFilePath(channel);
  try {
    if (fs13.existsSync(filePath)) {
      return JSON.parse(fs13.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error(`[pairing-ipc] Failed to read ${filePath}:`, e.message);
  }
  return { version: 1, requests: [] };
}
function writePairingFile(channel, data) {
  const filePath = getPairingFilePath(channel);
  fs13.mkdirSync(path13.dirname(filePath), { recursive: true });
  fs13.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}
function readAllowFromFile(channel, accountId) {
  const filePath = getAllowFromFilePath(channel, accountId);
  try {
    if (fs13.existsSync(filePath)) {
      return JSON.parse(fs13.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error(`[pairing-ipc] Failed to read ${filePath}:`, e.message);
  }
  return { version: 1, allowFrom: [] };
}
function writeAllowFromFile(channel, accountId, data) {
  const filePath = getAllowFromFilePath(channel, accountId);
  fs13.mkdirSync(path13.dirname(filePath), { recursive: true });
  fs13.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}
function registerPairingHandlers() {
  import_electron13.ipcMain.handle("pairing-list", async (_event, payload) => {
    try {
      const { channel } = payload || {};
      if (!channel) return { success: false, error: "Missing channel" };
      const data = readPairingFile(channel);
      return { success: true, requests: data.requests };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron13.ipcMain.handle("pairing-list-all", async () => {
    try {
      if (!fs13.existsSync(CREDENTIALS_DIR)) {
        return { success: true, channels: {} };
      }
      const files = fs13.readdirSync(CREDENTIALS_DIR);
      const channels = {};
      for (const file of files) {
        const match = file.match(/^(.+)-pairing\.json$/);
        if (!match) continue;
        const channel = match[1];
        const data = readPairingFile(channel);
        if (data.requests.length > 0) {
          channels[channel] = data.requests;
        }
      }
      return { success: true, channels };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron13.ipcMain.handle("pairing-approve", async (_event, payload) => {
    try {
      const { channel, code } = payload || {};
      if (!channel || !code) return { success: false, error: "Missing channel or code" };
      const pairingData = readPairingFile(channel);
      const reqIndex = pairingData.requests.findIndex(
        (r) => r.code.toUpperCase() === code.toUpperCase()
      );
      if (reqIndex === -1) {
        return { success: false, error: "No matching pairing request found" };
      }
      const req = pairingData.requests[reqIndex];
      const accountId = req.meta?.accountId || "default";
      const allowData = readAllowFromFile(channel, accountId);
      if (!allowData.allowFrom.includes(req.id)) {
        allowData.allowFrom.push(req.id);
      }
      writeAllowFromFile(channel, accountId, allowData);
      pairingData.requests.splice(reqIndex, 1);
      writePairingFile(channel, pairingData);
      console.log(`[pairing-ipc] Approved ${channel} pairing for user ${req.id} (${req.meta?.username || "unknown"})`);
      return { success: true, userId: req.id, username: req.meta?.username };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron13.ipcMain.handle("pairing-dismiss", async (_event, payload) => {
    try {
      const { channel, code } = payload || {};
      if (!channel || !code) return { success: false, error: "Missing channel or code" };
      const pairingData = readPairingFile(channel);
      const reqIndex = pairingData.requests.findIndex(
        (r) => r.code.toUpperCase() === code.toUpperCase()
      );
      if (reqIndex === -1) {
        return { success: false, error: "No matching pairing request found" };
      }
      pairingData.requests.splice(reqIndex, 1);
      writePairingFile(channel, pairingData);
      console.log(`[pairing-ipc] Dismissed ${channel} pairing request`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// src/updater.ts
var import_electron14 = require("electron");
var import_electron_updater = __toESM(require_main2());
var initialized = false;
var activeCheckPromise = null;
var manualCheckInProgress = false;
var manualDownloadInProgress = false;
var installPromptOpen = false;
var lastPromptedVersion = null;
var beforeInstallHook = null;
var getMainWindowHook = null;
function getDialogWindow() {
  const window2 = getMainWindowHook?.() ?? null;
  if (!window2 || window2.isDestroyed() || !window2.isVisible()) return void 0;
  return window2;
}
async function showInfo(title, message) {
  const window2 = getDialogWindow();
  if (window2) {
    await import_electron14.dialog.showMessageBox(window2, {
      type: "info",
      title,
      message,
      buttons: ["OK"]
    });
    return;
  }
  await import_electron14.dialog.showMessageBox({
    type: "info",
    title,
    message,
    buttons: ["OK"]
  });
}
async function showError(title, message) {
  const window2 = getDialogWindow();
  if (window2) {
    await import_electron14.dialog.showMessageBox(window2, {
      type: "error",
      title,
      message,
      buttons: ["OK"]
    });
    return;
  }
  await import_electron14.dialog.showMessageBox({
    type: "error",
    title,
    message,
    buttons: ["OK"]
  });
}
async function promptToInstall(version) {
  const options = {
    type: "info",
    title: "Update Ready",
    message: `Version ${version} has been downloaded.`,
    detail: "Restart MyOpenClaw now to install the update.",
    buttons: ["Restart and Install", "Later"],
    defaultId: 0,
    cancelId: 1
  };
  const window2 = getDialogWindow();
  const result = window2 ? await import_electron14.dialog.showMessageBox(window2, options) : await import_electron14.dialog.showMessageBox(options);
  if (result.response !== 0) return;
  if (!beforeInstallHook) {
    throw new Error("Auto updater install hook is not initialized");
  }
  await beforeInstallHook();
  import_electron_updater.autoUpdater.quitAndInstall(false, true);
}
function formatErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
function initializeAutoUpdater(options) {
  if (initialized) return;
  initialized = true;
  beforeInstallHook = options.beforeInstall;
  getMainWindowHook = options.getMainWindow;
  import_electron_updater.autoUpdater.autoDownload = true;
  import_electron_updater.autoUpdater.autoInstallOnAppQuit = false;
  import_electron_updater.autoUpdater.allowPrerelease = options.updateChannel === "beta";
  import_electron_updater.autoUpdater.logger = console;
  import_electron_updater.autoUpdater.on("checking-for-update", () => {
    console.log("[updater] Checking for updates...");
  });
  import_electron_updater.autoUpdater.on("update-available", (info) => {
    console.log(`[updater] Update available: ${info.version}`);
    manualDownloadInProgress = manualCheckInProgress;
    if (manualCheckInProgress) {
      void showInfo(
        "Update Available",
        `Version ${info.version} is available and is downloading in the background.`
      );
    }
  });
  import_electron_updater.autoUpdater.on("update-not-available", () => {
    console.log("[updater] No update available");
    if (manualCheckInProgress) {
      void showInfo(
        "You're Up to Date",
        `You're already running the latest version (${import_electron14.app.getVersion()}).`
      );
    }
  });
  import_electron_updater.autoUpdater.on("error", (error) => {
    const message = formatErrorMessage(error);
    console.error("[updater] Update error:", message);
    if (manualCheckInProgress || manualDownloadInProgress) {
      void showError("Update Failed", message);
    }
    manualDownloadInProgress = false;
  });
  import_electron_updater.autoUpdater.on("update-downloaded", (info) => {
    console.log(`[updater] Update downloaded: ${info.version}`);
    manualDownloadInProgress = false;
    if (installPromptOpen || lastPromptedVersion === info.version) return;
    installPromptOpen = true;
    void promptToInstall(info.version).then(() => {
      lastPromptedVersion = info.version;
    }).catch((error) => {
      console.error("[updater] Failed to prompt for install:", formatErrorMessage(error));
    }).finally(() => {
      installPromptOpen = false;
    });
  });
}
async function checkForAppUpdates(options = {}) {
  const { manual = false } = options;
  if (process.env.MYOPENCLAW_E2E === "1") return;
  if (!initialized) {
    if (manual) {
      await showInfo("Updates Unavailable", "The updater is still initializing. Please try again in a moment.");
    }
    return;
  }
  if (!import_electron14.app.isPackaged) {
    if (manual) {
      await showInfo("Updates Unavailable", "Update checks are only available in packaged builds.");
    }
    return;
  }
  if (activeCheckPromise) {
    if (manual) {
      await showInfo("Checking for Updates", "An update check is already in progress.");
    }
    return activeCheckPromise;
  }
  manualCheckInProgress = manual;
  activeCheckPromise = import_electron_updater.autoUpdater.checkForUpdates().then(() => void 0).catch((error) => {
    console.error("[updater] checkForUpdates failed:", formatErrorMessage(error));
  }).finally(() => {
    manualCheckInProgress = false;
    activeCheckPromise = null;
  });
  return activeCheckPromise;
}
function setUpdateChannel(channel) {
  import_electron_updater.autoUpdater.allowPrerelease = channel === "beta";
  console.log(`[updater] Update channel set to: ${channel}`);
}
function scheduleAutoUpdateCheck(delayMs = 1e4) {
  if (!initialized || !import_electron14.app.isPackaged || process.env.MYOPENCLAW_E2E === "1") return;
  const timer = setTimeout(() => {
    void checkForAppUpdates();
  }, delayMs);
  timer.unref?.();
}

// src/window.ts
var mainWindow = null;
var gatewayHandle = null;
var tray = null;
var isAppQuitting = false;
var quitCleanupPromise = null;
function getMainWindow() {
  return mainWindow;
}
function killGateway() {
  stopGatewayImmediately(gatewayHandle?.process ?? null);
  gatewayHandle = null;
}
function isQuitInProgress() {
  return isAppQuitting;
}
async function prepareAppQuit(reason = "user-request") {
  if (quitCleanupPromise) return quitCleanupPromise;
  isAppQuitting = true;
  console.log(`[app] Preparing quit (${reason})`);
  refreshTrayMenu();
  destroyTray();
  quitCleanupPromise = (async () => {
    try {
      await Promise.all([
        stopGatewayGracefully(gatewayHandle?.process ?? null),
        stopLogReporter()
      ]);
    } catch (err) {
      console.warn("[app] Graceful gateway shutdown failed, forcing stop:", err?.message || err);
      killGateway();
      return;
    } finally {
      gatewayHandle = null;
    }
  })().finally(() => {
    quitCleanupPromise = null;
  });
  await quitCleanupPromise;
}
function resolveAssetPath(...segments) {
  return path14.join(import_electron15.app.getAppPath(), ...segments);
}
function buildTrayIcon() {
  const iconPath = resolveAssetPath("build", "assets", "logo-openclaw.png");
  let icon;
  try {
    const buf = fs14.readFileSync(iconPath);
    icon = import_electron15.nativeImage.createFromBuffer(buf);
  } catch {
    console.warn("[tray] Failed to load tray icon:", iconPath);
    return null;
  }
  if (icon.isEmpty()) {
    console.warn("[tray] Tray icon is empty:", iconPath);
    return null;
  }
  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
    return icon.resize({ width: 18, height: 18 });
  }
  if (process.platform === "win32") {
    return icon.resize({ width: 16, height: 16 });
  }
  return icon;
}
function destroyTray() {
  if (!tray) return;
  try {
    tray.destroy();
  } catch {
  }
  tray = null;
}
function getTrayStatusLabel() {
  if (isAppQuitting) return "Status: Quitting";
  if (hasLiveGatewayProcess()) return "Status: Ready";
  return "Status: Starting";
}
function refreshTrayMenu() {
  if (!tray) return;
  const currentChannel = loadAppState().updateChannel || "stable";
  tray.setToolTip(`MyOpenClaw
${getTrayStatusLabel().replace("Status: ", "")}`);
  tray.setContextMenu(import_electron15.Menu.buildFromTemplate([
    { label: getTrayStatusLabel(), enabled: false },
    { type: "separator" },
    { label: "Check for Updates...", click: () => {
      void checkForAppUpdates({ manual: true });
    } },
    {
      label: "Update Channel",
      submenu: [
        {
          label: "Stable",
          type: "radio",
          checked: currentChannel === "stable",
          click: () => switchUpdateChannel("stable")
        },
        {
          label: "Beta",
          type: "radio",
          checked: currentChannel === "beta",
          click: () => switchUpdateChannel("beta")
        }
      ]
    },
    { label: "Open MyOpenClaw", click: () => showMainWindow() },
    { label: "Quit MyOpenClaw", click: () => import_electron15.app.quit() }
  ]));
}
function switchUpdateChannel(channel) {
  const state = loadAppState();
  state.updateChannel = channel;
  saveAppState(state);
  setUpdateChannel(channel);
  refreshTrayMenu();
  void checkForAppUpdates({ manual: true });
}
function ensureTray() {
  if (process.platform !== "win32" && process.platform !== "darwin") return null;
  if (tray) return tray;
  const icon = buildTrayIcon();
  if (!icon) return null;
  tray = new import_electron15.Tray(icon);
  refreshTrayMenu();
  if (process.platform === "win32") {
    tray.on("click", () => showMainWindow());
    tray.on("double-click", () => showMainWindow());
  }
  return tray;
}
function hideMainWindowToBackground() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
  refreshTrayMenu();
}
function bindWindowLifecycle(window2) {
  if (process.platform === "win32" || process.platform === "darwin") {
    window2.on("close", (event) => {
      if (isAppQuitting) return;
      event.preventDefault();
      hideMainWindowToBackground();
    });
  }
  if (process.platform === "win32") {
    const handleSystemSessionEnd = () => {
      if (isAppQuitting) return;
      isAppQuitting = true;
      destroyTray();
      killGateway();
    };
    const sessionAwareWindow = window2;
    sessionAwareWindow.on("query-session-end", handleSystemSessionEnd);
    sessionAwareWindow.on("session-end", handleSystemSessionEnd);
  }
  window2.on("closed", () => {
    if (mainWindow === window2) {
      mainWindow = null;
    }
    refreshTrayMenu();
  });
  window2.on("show", () => refreshTrayMenu());
  window2.on("hide", () => refreshTrayMenu());
}
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
  refreshTrayMenu();
}
function getLiveGatewayHandle() {
  if (!gatewayHandle?.process) return null;
  if (gatewayHandle.process.killed || gatewayHandle.process.exitCode != null) return null;
  return gatewayHandle;
}
function hasLiveGatewayProcess() {
  return getLiveGatewayHandle() != null;
}
var updateLoadingStatus = (message, percent) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const safeMsg = String(message || "").replace(/`/g, "\\`").replace(/\\/g, "\\\\");
    const safePct = Number(percent || 0);
    mainWindow.webContents.executeJavaScript(
      `window.__REAL_LOADING_DRIVEN__=true; if (window.setLoadingState) { window.setLoadingState(\`${safeMsg}\`, ${safePct}); }`,
      true
    ).catch(() => {
    });
  } catch {
  }
};
function registerAllIpcHandlers() {
  const getGW = () => gatewayHandle;
  const onStartGateway = async () => {
    gatewayHandle = await startGateway(updateLoadingStatus);
    refreshTrayMenu();
  };
  registerGatewayHandlers(getGW);
  registerChatHandlers(getGW, () => mainWindow);
  registerAppStateHandlers();
  registerSubscriptionHandlers();
  registerAgentHandlers();
  registerProviderHandlers(getGW, onStartGateway);
  registerRelayHandlers();
  registerDeviceHandlers();
  registerChannelHandlers();
  registerSkillsHandlers(getGW);
  registerCronHandlers(getGW);
  registerPairingHandlers();
  startLogReporter();
}
function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow();
    return;
  }
  import_electron15.Menu.setApplicationMenu(null);
  ensureTray();
  const useFastReopen = process.platform === "darwin" && hasLiveGatewayProcess();
  mainWindow = new import_electron15.BrowserWindow({
    width: 1200,
    height: 800,
    show: !useFastReopen,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path14.join(__dirname, "preload.js"),
      webviewTag: true
    }
  });
  bindWindowLifecycle(mainWindow);
  if (useFastReopen) {
    mainWindow.once("ready-to-show", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.show();
      mainWindow.focus();
      refreshTrayMenu();
    });
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const gw = gatewayHandle;
    const target = /^https?:\/\/127\.0\.0\.1:\d+\/?$/i.test(String(url || "")) ? buildDashboardUrl(url, gw?.baseUrl) : url;
    import_electron15.shell.openExternal(target);
    return { action: "deny" };
  });
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (input.type !== "keyDown") return;
    const meta = input.meta;
    if (meta && input.key === "r") {
      mainWindow.webContents.reload();
    } else if (meta && input.shift && input.key === "i") {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("[renderer] process gone:", details.reason, details.exitCode);
  });
  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("[renderer] did-fail-load:", code, desc);
  });
  if (useFastReopen) {
    console.log("[startup] Fast macOS reopen: gateway is still alive, loading main UI directly");
    mainWindow.loadFile("index.html");
    refreshTrayMenu();
    return;
  }
  mainWindow.loadFile("loading.html");
  (async () => {
    try {
      if (process.env.MYOPENCLAW_E2E === "1") {
        console.log("[startup] E2E mode: skipping runtime download and gateway start");
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadFile("index.html");
          refreshTrayMenu();
        }
        return;
      }
      const liveGatewayHandle = getLiveGatewayHandle();
      if (liveGatewayHandle?.process) {
        console.log("[startup] Gateway still alive (PID=%d), skipping startup flow", liveGatewayHandle.process.pid);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadFile("index.html");
          refreshTrayMenu();
        }
        return;
      }
      console.log("[startup] Begin startup flow...");
      let openclawBin = findOpenClawCli();
      console.log("[startup] findOpenClawCli =", openclawBin || "(not found)");
      console.log("[startup] findRuntimeDir =", findRuntimeDir() || "(not found)");
      if (!openclawBin && !findRuntimeDir()) {
        console.log("[startup] No openclaw or runtime found, downloading runtime...");
        updateLoadingStatus("Downloading OpenClaw runtime...", 30);
        await ensureEmbeddedRuntime(updateLoadingStatus);
        clearCliCache();
        openclawBin = findOpenClawCli();
      }
      if (openclawBin) {
        ensureOpenClawInPath(openclawBin);
      }
      if (!fs14.existsSync(CONFIG_FILE)) {
        const binForOnboard = openclawBin || findOpenClawCli();
        if (binForOnboard) {
          updateLoadingStatus("Running first-time setup...", 80);
          console.log("[startup] No config found, running openclaw onboard...");
          await runOpenClawOnboard(binForOnboard);
        } else if (findRuntimeDir()) {
          try {
            updateLoadingStatus("Running first-time setup...", 80);
            console.log("[startup] No CLI found, running onboard via node entry point...");
            const runtimeDir = findRuntimeDir();
            const nodeBin = findNodeBinary();
            const entryMjs = path14.join(runtimeDir, "openclaw-deps", "openclaw", "openclaw.mjs");
            const entryJs = path14.join(runtimeDir, "openclaw-deps", "openclaw", "dist", "entry.js");
            const entryFile = fs14.existsSync(entryMjs) ? entryMjs : entryJs;
            await runOpenClawOnboard(nodeBin, [entryFile], runtimeDir);
          } catch (onboardErr) {
            console.error("[startup] Onboard via node failed:", onboardErr.message);
          }
        } else {
          console.log("[startup] No openclaw CLI or runtime available for onboard, skipping");
        }
      }
      if (fs14.existsSync(CONFIG_FILE)) {
        await ensureMainAgentSoul();
        gatewayHandle = await startGateway(updateLoadingStatus);
        refreshTrayMenu();
      } else {
        console.log("[startup] No gateway config after onboard, relay-only mode");
        refreshTrayMenu();
      }
    } catch (err) {
      console.error("[startup] Error:", err.message);
      global.__MYOPENCLAW_STARTUP_ERROR__ = err?.message || String(err);
      updateLoadingStatus(`Setup error: ${err?.message || "Unknown error"}`, 0);
      refreshTrayMenu();
      await new Promise((r) => setTimeout(r, 3e3));
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile("index.html");
      refreshTrayMenu();
    }
  })();
}

// src/main.ts
initFileLogger();
var isVM = (() => {
  try {
    const cpuModel = os6.cpus()?.[0]?.model || "";
    return /virtual|Apple Virtual|QEMU|KVM|VirtualBox|VMware/i.test(cpuModel);
  } catch {
    return false;
  }
})();
if (isVM) {
  import_electron16.app.commandLine.appendSwitch("disable-gpu");
  console.log("[gpu] Disabled GPU acceleration (VM detected)");
}
process.stdout?.on("error", () => {
});
process.stderr?.on("error", () => {
});
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    import_electron16.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path15.resolve(process.argv[1])]);
  }
} else {
  import_electron16.app.setAsDefaultProtocolClient(PROTOCOL);
}
import_electron16.app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url, getMainWindow);
});
var gotTheLock = import_electron16.app.requestSingleInstanceLock();
var exitRequested = false;
function requestAppExit(reason) {
  if (exitRequested) return;
  exitRequested = true;
  console.log(`[app] Exit requested (${reason})`);
  void prepareAppQuit(reason).catch((err) => {
    console.error("[app] Quit cleanup failed:", err?.message || err);
  }).finally(() => {
    import_electron16.app.exit(0);
  });
}
if (!gotTheLock) {
  import_electron16.app.quit();
} else {
  import_electron16.app.on("second-instance", (_event, argv) => {
    const deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl, getMainWindow);
    showMainWindow();
  });
  registerAllIpcHandlers();
  import_electron16.app.whenReady().then(() => {
    console.log("[app] ready");
    const deviceId = ensureDeviceId();
    registerDevice(deviceId, import_electron16.app.getVersion());
    const state = loadAppState();
    if (!state.relay.baseUrl) {
      state.relay.baseUrl = RELAY_BASE_URL;
      saveAppState(state);
    }
    startPerfMonitor();
    console.log("[app] creating window...");
    createWindow();
    initializeAutoUpdater({
      getMainWindow,
      beforeInstall: () => prepareAppQuit("update-install"),
      updateChannel: state.updateChannel || "stable"
    });
    scheduleAutoUpdateCheck();
    const launchUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (launchUrl) handleDeepLink(launchUrl, getMainWindow);
  });
  import_electron16.app.on("window-all-closed", () => {
    if (process.platform === "linux") {
      requestAppExit("window-all-closed");
    }
  });
  import_electron16.app.on("before-quit", (event) => {
    if (exitRequested || isQuitInProgress()) return;
    event.preventDefault();
    requestAppExit("before-quit");
  });
  import_electron16.app.on("activate", () => {
    showMainWindow();
  });
}
/*! Bundled license information:

sax/lib/sax.js:
  (*! http://mths.be/fromcodepoint v0.1.0 by @mathias *)
*/
