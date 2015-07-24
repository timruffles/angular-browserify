function createFakeServer(resourceName,localStorageOverride) {

  var server = sinon.fakeServer.create();


  var o = server.processRequest;
  server.processRequest = function(xhr) {
    console.log("%s %s",xhr.method,xhr.url,xhr);
    return o.apply(server,arguments);
  };
  var records = new Storage(localStorageOverride || localStorage,resourceName);


  server.respondWith("GET",  new RegExp('/api/' + resourceName + '$'),all);
  server.respondWith("GET",  new RegExp('/api/' + resourceName + '/(\\d+)'),get);
  server.respondWith("POST", new RegExp('/api/' + resourceName + '$'),create);
  server.respondWith("POST", new RegExp('/api/' + resourceName + '/(\\d+)'),update);
  server.respondWith("PUT",  new RegExp('/api/' + resourceName + '/(\\d+)'),update);
  server.respondWith("DELETE", new RegExp('/api/' + resourceName + '/(\\d+)'),remove);

  server.autoRespond = true;
  server.autoRespondAfter = 850;

  // allow XHR requests for templates etc
  sinon.FakeXMLHttpRequest.useFilters = true;
  sinon.FakeXMLHttpRequest.addFilter(function(method, path) {
    return /^\/src\//.test(path);
  });

  function all(xhr) {
    xhr.respond(200,{},records.all());
    return true;
  }

  function get(xhr,id) {
    var img = records.get(id);
    if(!img) return xhr.respond(404);
    xhr.respond(200,{},img);
    return true;
  }

  function create(xhr) {
    var jsonRecord = records.create(JSON.parse(xhr.requestBody));
    xhr.respond(200,{},jsonRecord);
    return true;
  }

  function update(xhr,id) {
    var img = records.get(id);
    if(!img) return xhr.respond(404);
    var saved = records.update(JSON.parse(xhr.requestBody),id);
    xhr.respond(200,{},saved);
    return true;
  }

  function remove(xhr,id) {
    var resp = records.remove(id) ? 200 : 404;
    xhr.respond(resp,{},"{}");
    return true;
  }
}

function Storage(localStorage,resourceName) {
  this.localStorage = localStorage;
  this.localStorage.id = localStorage.id || 0;
  this.resourceName = resourceName;
}

Storage.prototype = {
  all: function() {
    var match = new RegExp('^' + this.resourceName);
    var asJson = Object.keys(this.localStorage).filter(function(x) {
      return match.test(x);
    }).map(function(k) {
      return this.localStorage[k];
    },this);
    return "[" + asJson.join(",") + "]";
  },
  nextId: function() {
    var next = parseInt(this.localStorage.id) + 1;
    return this.localStorage.id = next;
  },
  get: function(id) {
    return this.localStorage[this.resourceName + '-' + id];
  },
  create: function(v) {
    v.id = this.nextId();
    return this.localStorage[this.resourceName + '-' + v.id] = JSON.stringify(v);
  },
  update: function(u,id) {
    var img = JSON.parse(this.get(id))
    for(var p in u) {
      img[p] = u[p]
    }
    var updated = this.localStorage[this.resourceName + '-' + id] = JSON.stringify(img);
    return updated;
  },
  remove: function(id) {
    if(!this.localStorage[this.resourceName + '-' + id]) return false;
    delete this.localStorage[this.resourceName + '-' + id];
    return true;
  }
}

