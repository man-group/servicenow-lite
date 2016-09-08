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

function tableNameFromPrefix(prefix) {
  return _.find(config.tables, function(table) {
    return table.prefix == prefix;
  }).name;
}

function prefixFromTableName(tableName) {
  return _.find(config.tables, function(table) {
    return table.name == tableName;
  }).prefix;
}

function tableNameFromId(recordId) {
  return tableNameFromPrefix(getPrefix(recordId));
}

function dateFieldFromId(recordId) {
  var prefix = getPrefix(recordId);
  return _.find(config.tables, function(table) {
    return table.prefix == prefix;
  }).date_field || 'sys_created_on';
}

function cloneFieldsFromPrefix(prefix) {
  return _.find(config.tables, function(table) {
    return table.prefix == prefix;
  }).clone_fields || null;
}

function webFieldsFromId(recordId) {
  var prefix = getPrefix(recordId);
  return _.find(config.tables, function(table) {
    return table.prefix == prefix;
  }).web_fields || null;
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
