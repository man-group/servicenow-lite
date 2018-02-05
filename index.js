"use strict";

var soap = require("soap");
var _ = require("underscore");
var moment = require("moment");
var async = require("async");
var request = require("request");

// TODO: release this as a separate module.
var config = require("./config");

// TODO: this would probably be cleaner with a promise based API.

// Call callback with a SOAP client object that can talk to our
// servicenow instance.
function getClient(table, callback) {
  // URL is based on http://wiki.servicenow.com/index.php?title=SOAP_Web_Service
  var url = config.ROOT_URL + "/" + table + ".do?WSDL";

  var username = process.env.HUBOT_SERVICENOW_USER;
  var password = process.env.HUBOT_SERVICENOW_PASSWORD;

  // We explicitly configure request, because some servicenow
  // instances require authentication even to download the WSDL.
  var requestWithCreds = request.defaults({
    auth: {
      user: username,
      pass: password,
      sendImmediately: false
    }
  });

  soap.createClient(
    url,
    {
      escapeXML: true,
      request: requestWithCreds
    },
    function(err, client) {
      if (err) {
        callback(err);
        return;
      }

      client.setSecurity(new soap.BasicAuthSecurity(username, password));
      callback(null, client);
    }
  );
}

// Retrieve all the servicenow records this table that match parameters.
// Official docs: http://wiki.servicenow.com/index.php?title=SOAP_Direct_Web_Service_API#getRecords
function getRecordsWhere(table, parameters, callback) {
  return getClient(table, function(err, client) {
    if (err) {
      callback(err);
      return;
    }
    client.getRecords(parameters, function(err, result) {
      if (err) {
        callback(err);
        return;
      }
      if (result && result.getRecordsResult) {
        callback(null, result.getRecordsResult);
      } else {
        callback(null, []);
      }
    });
  });
}

// Given an ID, e.g. 'CR1234', call the callback with an object describing
// all its properties.
function getRecordById(id, callback) {
  // Arguments based on http://wiki.servicenow.com/index.php?title=SOAP_Direct_Web_Service_API#getRecords
  var args = { number: id };
  getRecordsWhere(config.tableName(id), args, function(err, records) {
    if (err) {
      callback(err);
      return;
    }
    if (records && records.length > 0) {
      callback(null, records[0]);
    } else {
      callback(null, null);
    }
  });
}

function recordId(record) {
  return record.number;
}

// Given two arrays of tickets, return the combined array, sorted by date.
function mergeRecordArrays(array1, array2) {
  var result = array1.concat(array2);

  // Sort results newest first.
  // TODO: this is sorting tickets incorrectly when we have multiple
  // tickets for the same day. We should also sort by ID.
  result = _.sortBy(result, function(item) {
    var id = recordId(item);
    var field = config.dateField(id);
    return moment(item[field]).toDate();
  });
  return result.reverse();
}

// Get all records created by this username.
function recordsCreatedBy(creator, callback) {
  // For every table type, get all the records created by the current user.
  function recordsInTable(table, cb) {
    return getRecordsWhere(table, { sys_created_by: creator }, cb);
  }

  // recordsInTable "change_request", callback
  async.map(config.TABLE_NAMES, recordsInTable, function(err, results) {
    if (err) {
      callback(err);
      return;
    }
    var merged = _.reduce(results, mergeRecordArrays);
    callback(null, merged);
  });
}

// Retrieve work notes for a sys ID. This does not work for record IDs
// (so '123456789123456789abcdef12345678' not 'CR1234').
function workNotesBySysId(sysId, callback) {
  // Arguments based on https://community.servicenow.com/thread/163805
  var args = {
    element_id: sysId,
    element: "work_notes"
  };
  getRecordsWhere("sys_journal_field", args, callback);
}

// Given an object specifying fields for a ticket, create it.
function createTicket(params, prefix, callback) {
  getClient(config.tableName(prefix), function(err, client) {
    if (err) {
      callback(err, null);
      return;
    }
    client.insert(params, callback);
  });
}

// Find all items in this table that match the string `searchTerm`.
function searchRecords(table, searchTerm, callback) {
  var prefix = config.prefixFromTableName(table);

  var args = {
    // This weird API is based on doing a search in the web UI, and extracting the encoded query,
    // as documented in:
    // http://wiki.servicenow.com/index.php?title=Encoded_Query_Strings#Generating_Encoded_Query_Strings_through_a_Filter
    // plus the discussion here https://community.servicenow.com/thread/165927
    __encoded_query: "123TEXTQUERY321=" + searchTerm,
    // Other API parameters documented at
    // http://wiki.servicenow.com/?title=Direct_Web_Services#Extended_Query_Parameters
    __order_by_desc: config.dateField(prefix),
    __limit: 15
  };
  getRecordsWhere(table + "_list", args, callback);
}

// Find all tickets matching the string `searchTerm`.
function search(searchTerm, callback) {
  function searchRecordsInTable(table, cb) {
    searchRecords(table, searchTerm, cb);
  }

  async.map(config.TABLE_NAMES, searchRecordsInTable, function(err, results) {
    if (err) {
      callback(err);
      return;
    }
    var merged = _.reduce(results, mergeRecordArrays);
    callback(null, merged);
  });
}

// Find the servicenow details for the requested user.
// e.g. 'jsmith' -> {sys_id: '12345678901234abcdef', ...}
function getUser(queryUser, callback) {
  return getRecordsWhere(
    "sys_user",
    {
      user_name: queryUser
    },
    function(err, results) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, results[0]);
    }
  );
}

module.exports = {
  recordId: recordId,
  getRecordById: getRecordById,
  recordsCreatedBy: recordsCreatedBy,
  workNotesBySysId: workNotesBySysId,
  createTicket: createTicket,
  search: search,
  getUser: getUser,
  config: config
};
