const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'src');
const ctx = vm.createContext({});
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.gs'))) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), {filename:file}).runInContext(ctx);
}
const user = (role, departmentId='D1', userId='U1') => ({role, departmentId, userId, status:'ACTIVE'});
test('all roles enforce visibility and assignment scope', () => {
  const own = {departmentId:'D1', doerUserId:'U1'};
  const peer = {departmentId:'D1', doerUserId:'U2'};
  const other = {departmentId:'D2', doerUserId:'U2'};
  for (const role of ['ADMIN','MD']) {
    assert.equal(ctx.canViewTask_(user(role),other),true);
    assert.equal(ctx.canAssignTo_(user(role),user('STAFF','D2')),true);
  }
  for (const role of ['MANAGER','HOD']) {
    assert.equal(ctx.canViewTask_(user(role),peer),true);
    assert.equal(ctx.canViewTask_(user(role),other),false);
    assert.equal(ctx.canAssignTo_(user(role),user('STAFF','D2')),false);
    assert.equal(ctx.canAssignTo_(user(role),user('STAFF')),true);
    assert.equal(ctx.canViewTask_(user(role,''),{departmentId:''}),false);
  }
  for (const role of ['STAFF','EMPLOYEE']) {
    assert.equal(ctx.canViewTask_(user(role),own),true);
    assert.equal(ctx.canViewTask_(user(role),peer),false);
    assert.equal(ctx.canAssignTo_(user(role),user('STAFF')),false);
  }
});
test('user management is Admin only; invalid identities fail closed', () => {
  assert.equal(ctx.canManageUsers_(user('ADMIN')),true);
  for (const role of ['MD','MANAGER','HOD','STAFF','EMPLOYEE','UNKNOWN','']) {
    assert.equal(ctx.canManageUsers_(user(role)),false);
  }
  for (const actor of [null, {}, user('UNKNOWN'), {...user('ADMIN'),status:'INACTIVE'},user('ADMIN','D1','')]) {
    assert.equal(ctx.canViewTask_(actor,{departmentId:'D1',doerUserId:'U1'}),false);
    assert.equal(ctx.canAssignTo_(actor,user('STAFF')),false);
  }
});
test('public business endpoints deny access before implementation', () => {
  for (const fn of ['listTasks','createTask','updateTask','getDashboard']) {
    assert.throws(() => ctx[fn]({}), /Access denied/);
  }
});
test('configuration and notification defaults are safe', () => {
  ctx.PropertiesService = {getScriptProperties:() => ({getProperty:() => null})};
  assert.equal(ctx.getConfig_().authMode,'UNCONFIGURED');
  assert.throws(() => ctx.requireSpreadsheetId_(),/not configured/);
  assert.equal(ctx.processNotificationOutbox_().disabled,true);
  assert.throws(() => ctx.generateRecurringOccurrences_(),/not implemented/);
});
test('manifest parses and template includes are restricted', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'appsscript.json'),'utf8'));
  assert.equal(manifest.runtimeVersion,'V8');
  assert.throws(() => ctx.include_('Auth'),/Invalid template/);
});
