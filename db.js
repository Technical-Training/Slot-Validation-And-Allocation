const mysql = require("mysql");
const uuid = require("uuid");
const config = {
  host: "localhost",
  user: "root",
  password: "foo",
  database: "test",
};

function df(a) {
  let str=a.toLocaleString();
  let [x,y] = str.split(', ');
  let [D, M, Y] = x.split(`/`);
  return `${Y}-${M}-${D} ${y}`;
}

function get_slots(userName, start, end) {
  var connection = mysql.createConnection(config);
  if (start >= end) {
    console.log('invalid time interval!');
    return;
  }
  new Promise((resolve, reject) => {
    // check if user exists.
    connection.query(`select * from userbase where username = '${userName}'`, (err,res) => {
      if (err || res.length===0) {
        console.log('invalid user!');
        reject();
      } else {
        resolve();
      }
    });
  }).then(() => {
    new Promise(() => {// query to check for all slots
      connection.query(`select start, end, id from Bookings where \
        ('${userName}' = username) and (start >= '${df(start)}' and end <= '${df(end)}' );`, (err,res) => {
        if (err) {
          console.log(err);
        } else {
          res.forEach((row) => {
            console.log(row);
          });
        }
        console.log('done');
        connection.end();  
      });
    });
  }).catch(()=>connection.end());
}

function claim_slot(userName, id, start, end) {
  var connection = mysql.createConnection(config);
  if (start >= end) {
    console.log('invalid intervals!.');
    return;
  }
  new Promise((resolve,reject) => {
    //query to check if username exists
    connection.query(`select username from userbase where username = '${userName}'`, (err,res)=>{
      if (err || res.length === 0) {
        console.log(`no user found with username '${userName}'`);
        reject();
      } else {
        resolve();
      }
    });
  }).then(() => {
    new Promise((resolve,reject) => {
      //query will extract bookings data of id
      connection.query(`select username, start, end from Bookings where id = '${id}';`, (err,res)=>{
        if (err || res.length === 0) {
          console.log('no Booking found with id : \''+id+'\'');
          reject();
        } else if (userName == res[0].username) {
          console.log(res);
          console.log(`one can not book meeting with his own. '${userName}' : '${res[0].username}'`);
          reject();
        } else {
          resolve({
            name: res[0].username,
            start: res[0].start,
            end: res[0].end
          });
        }
      });
    }).then((args) => {
      new Promise((resolve,reject) => {
        //query will check if limits are not overlapping
        if (start >= args.start && end <= args.end) {
          resolve(args);
        } else {
          console.log(start, end);
          console.log(args.start, args.end);
          console.log('given interval should be in range of booking id\'s interval');
          reject();
        }
      }).then((args) => {
        new Promise(resolve=>{
          //query to delete booking at id
          connection.query(`delete from Bookings where id = '${id}'`, (err,res)=>{
            if (err) console.log(err);
            resolve(args);
          });
        }).then((args)=>{
          new Promise(resolve=>{
            //query to insert booked slot in user1
            connection.query(`insert into Bookings values ('${userName}', '${df(start)}', '${df(end)}', 1, '${args.name}', '${id}')`, (err,res)=>{
              if (err) console.log(err);
              resolve(args);
            });
          }).then((args) => {
            new Promise(resolve=>{
              // query to insert booked slot in user2
              connection.query(`insert into Bookings values ('${args.name}', '${df(start)}', '${df(end)}', 1, '${userName}', '${id}')`, (err,res)=>{
                if (err) console.log(err);
                resolve(args);
              });
            }).then((args) => {
              new Promise(resolve=>{
                // query to insert left over left side unbooked slot
                if (args.start.valueOf() !== start.valueOf()) {
                  connection.query(`insert into Bookings values ('${args.name}', '${df(args.start)}', '${df(start)}', 0, 'nil', '${uuid.v4()}')`, (err,res)=>{
                    if (err) console.log(err);
                    resolve(args);
                  });
                } else {
                  resolve(args);
                }
              }).then((args) => {
                new Promise(resolve=>{
                  //query to insert left over right side of unbooked slot
                  if (args.end.valueOf() !== end.valueOf()) {
                    connection.query(`insert into Bookings values ('${args.name}', '${df(end)}', '${df(args.end)}', 0, 'nil', '${uuid.v4()}')`, (err,res)=>{
                      if (err) console.log(err);
                      resolve();
                    });
                  } else {
                    resolve();
                  }
                }).then((args) => {
                  console.log('done');
                  connection.end();
                });
              });
            });
          });
        });
      }).catch(() => connection.end());
    }).catch(() => connection.end());
  }).catch(() => connection.end());
}

function allot_slot(userName, start, end) {
  var connection = mysql.createConnection(config);
  if (start >= end) {
    console.log('invalid time interval!');
    return;
  }
  new Promise((resolve,reject) => {
    //query to check username
    connection.query(`select username from userbase where username = '${userName}'`, (err, res) => {
      if (err || res.length === 0) {
        console.log('err: invalid username!');
        reject();
      } else resolve();
    });
  }).then(() => {
    new Promise((resolve,reject) => {
      //query to check overlapping timeslots
      connection.query(`select * from Bookings where (username = '${userName}') and \
      ((start >= '${df(start)}' and end <= '${df(end)}') or \
      (start < '${df(start)}' and end > '${df(end)}') or \
      (start < '${df(start)}' and end > '${df(end)}') or \
      (start <= '${df(start)}' and end >= '${df(end)}'))`, (err,res) => {
        if (err || res.length !==0) {
          console.log('err: time overlaps with prevous intervals');
          res.forEach((row) => console.log(row));
          reject();
        } else resolve();
      });
    }).then(() => {
      new Promise(resolve => {
        //query to insert timeslot
        connection.query(`insert into Bookings values ('${userName}', '${df(start)}', '${df(end)}', 0, 'nil', '${uuid.v4()}');`, err => {
          if (err) 
            console.log(err);
          else 
            resolve();
        });
      }).then(() => {
        connection.end();
        console.log('done!');
      });
    }).catch(()=>connection.end());
  }).catch(()=>connection.end());
}

function delete_slot (id) {
  var connection = mysql.createConnection(config);
  new Promise((resolve, reject) => {
    // check if id exists
    connection.query(`select id from Bookings where id = '${id}';`, (err,res) => {
      if (err || res.length === 0) {
        console.log(err ? err : 'err: id doesn\'t exists.');
        reject();
      } else resolve();
    });
  }).then(() => {
    new Promise((resolve) => {
      //delete booking with id
      connection.query(`delete from Bookings where id = '${id}';`, err=>{
        if(err) console.log(err);
        resolve();
      });
    }).then(()=>{
      console.log('deleted!');
      connection.end();
    });
  }).catch(()=>connection.end());
}

function add_user (userName, passWord) {
  var connection = mysql.createConnection(config);
  if (!userName || !passWord) {
    console.log('please give proper arguments');
    return ;
  }
  new Promise((resolve,reject) => {
    // check weather user exists 
    connection.query(`select username from userbase where username = '${userName}'`, (err,res) => {
      if (err) {
        console.log(err);
        reject();
      } else if (res.length !== 0) {
        console.log('userName already exists');
        reject();
      } else {
        resolve();
      }
    });
  }).then(()=>{
    new Promise(res=>{
      //add user ...
      connection.query(`insert into userbase values('${userName}','${passWord}')`, err=>{
        if (err) console.log(err);
        res();
      });
    }).then(()=>connection.end());
  }).catch(()=>connection.end());
}

function rem_user (userName) {
  var connection = mysql.createConnection(config);
  if (!userName) {
    console.log('please enter name.');
    return;
  }
  new Promise((resolve,reject) => {
    // check weather user exists 
    connection.query(`select username from userbase where username = '${userName}'`, (err,res) => {
      if (err) {
        console.log(err);
        reject();
      } else if (res.length === 0) {
        console.log('userName doesn\'t exists');
        reject();
      } else {
        resolve();
      }
    });
  }).then(()=>{
    new Promise(res=>{
      // delete user
      connection.query(`delete from userbase where username = '${userName}';`, err=>{
        if (err) console.log(err);
        res();
      });
    }).then(()=>connection.end());
  }).catch(()=>connection.end());
}

module.exports = {
  add_user,
  rem_user,
  get_slots,
  claim_slot,
  allot_slot,
  delete_slot
};