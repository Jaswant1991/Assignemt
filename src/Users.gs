function listUsers() { return api_(function(db,user){requireAdmin_(user);return read_(db,'Users');}); }
function listDepartments() {
  return api_(function(db,user) {
    return read_(db,'Departments').filter(function(d){
      return canManageUsers_(user) || (d.status === 'ACTIVE' && (canonicalRole_(user.role) === 'MD' || d.departmentId === user.departmentId));
    });
  });
}
function saveDepartment(input) {
  return api_(function(db,user) {
    requireAdmin_(user); fields_(input,['departmentId','departmentName','managerUserId','status']);
    var existing = input.departmentId ? find_(db,'Departments',input.departmentId) : null;
    var r={departmentId:existing ? existing.departmentId : id_(),departmentName:text_(input.departmentName,100,true),
      managerUserId:input.managerUserId || '',status:enum_(input.status,['ACTIVE','INACTIVE'])};
    assert_(!read_(db,'Departments').some(function(d){return d.departmentId !== r.departmentId && d.departmentName.toLowerCase() === r.departmentName.toLowerCase();}), 'Department name already exists.');
    if (r.managerUserId) {
      var manager=find_(db,'Users',r.managerUserId);
      assert_(isActiveUser_(manager) && ['ADMIN','MANAGER'].indexOf(canonicalRole_(manager.role)) >= 0, 'Invalid department manager.');
    }
    commit_(db,[{table:'Departments',record:r},audit_(user,'Department',r.departmentId,'SAVE',r.departmentName)]);
    return r;
  });
}
function saveUser(input) {
  return api_(function(db,actor) {
    requireAdmin_(actor);
    fields_(input,['userId','name','email','role','departmentId','managerUserId','mobile','status','expectedUpdatedAt']);
    var old = input.userId ? find_(db,'Users',input.userId) : null;
    if (old) assert_(input.expectedUpdatedAt === old.updatedAt, 'User changed. Refresh before saving.');
    var ts=old ? new Date(Math.max(Date.now(), Date.parse(old.updatedAt)+1)).toISOString() : now_(), role=canonicalRole_(input.role);
    assert_(role, 'Invalid role.');
    var u={userId:old ? old.userId : id_(),name:text_(input.name,100,true),email:email_(input.email),
      role:role,departmentId:input.departmentId || '',managerUserId:input.managerUserId || '',
      mobile:text_(input.mobile || '',30,false),status:enum_(input.status,['ACTIVE','INACTIVE']),
      createdAt:old ? old.createdAt : ts,updatedAt:ts};
    var users=read_(db,'Users');
    assert_(!users.some(function(x){return x.userId !== u.userId && x.email === u.email;}), 'Email already exists.');
    if (['MANAGER','STAFF'].indexOf(role) >= 0) assert_(u.departmentId, 'Department required.');
    if (u.departmentId) assert_(find_(db,'Departments',u.departmentId).status === 'ACTIVE', 'Department inactive.');
    if (u.managerUserId) {
      var m=find_(db,'Users',u.managerUserId);
      assert_(m.userId !== u.userId && isActiveUser_(m) && ['ADMIN','MANAGER'].indexOf(canonicalRole_(m.role)) >= 0, 'Invalid reporting manager.');
    }
    if (old && canonicalRole_(old.role) === 'ADMIN' && (role !== 'ADMIN' || u.status !== 'ACTIVE'))
      assert_(users.some(function(x){return x.userId !== u.userId && canManageUsers_(x);}), 'Keep at least one active Admin.');
    commit_(db,[{table:'Users',record:u},audit_(actor,'User',u.userId,old ? 'UPDATE' : 'CREATE','Directory details changed')]);
    return u;
  });
}
function doers_(db,user) {
  return read_(db,'Users').filter(function(u){return canAssignTo_(user,u);}).map(function(u) {
    return {userId:u.userId,name:u.name,email:u.email,departmentId:u.departmentId};
  });
}
