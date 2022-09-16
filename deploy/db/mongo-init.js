use liane;

db.real_liane.createIndex({From: 1, To: 1}, {unique: true});
db.real_liane.createIndex({Location: "2dsphere"});

db.rallying_point.createIndex({Location: "2dsphere"});

db.user.createIndex({Phone: 1}, {unique: true});