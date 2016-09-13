'use strict';

var _ = require('underscore');
var path = require('path');

var etc = require('etc');

var configPath = path.join(require('app-root-dir').get(), 'servicenow.yaml');
var config = etc()
    .use(require('etc-yaml'))
    .file(configPath)
    .toJSON();

function getPrefix(recordId) {
  return recordId.replace(/[^A-Z]/g, "");
}

// Find the table with prefix `prefix`, and get the `key` requested,
// or `defaultValue` if key is not present.
function tableAttr(prefix, key, defaultValue) {
  defaultValue = defaultValue || null;

  return _.find(config.tables, function(table) {
    return table.prefix == prefix;
  })[key] || defaultValue;
}

// TODO: just take recordId for all these functions, for consistency.
function tableNameFromPrefix(prefix) {
  return tableAttr(prefix, 'name');
}

function prefixFromTableName(tableName) {
  return _.find(config.tables, function(table) {
    return table.name == tableName;
  }).prefix;
}

function tableNameFromId(recordId) {
  var prefix = getPrefix(recordId);
  return tableAttr(prefix, 'name');
}

function dateFieldFromId(recordId) {
  var prefix = getPrefix(recordId);
  return tableAttr(prefix, 'date_field', 'sys_created_on');
}

function cloneFieldsFromPrefix(prefix) {
  return tableAttr(prefix, 'clone_fields');
}

function webFieldsFromId(recordId) {
  var prefix = getPrefix(recordId);
  return tableAttr(prefix, 'web_fields');
}

module.exports = {
  ROOT_URL: config.root_url,
  PREFIXES: _.pluck(config.tables, "prefix"),
  TABLE_NAMES: _.pluck(config.tables, "name"),
  getPrefix: getPrefix,
  prefixFromTableName: prefixFromTableName,
  tableNameFromPrefix: tableNameFromPrefix,
  tableNameFromId: tableNameFromId,
  dateFieldFromId: dateFieldFromId,
  cloneFieldsFromPrefix: cloneFieldsFromPrefix,
  webFieldsFromId: webFieldsFromId
};
