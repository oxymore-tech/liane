use liane;

db.rallying_point.createIndex({Location: "2dsphere"}, {unique: true});
db.trip_intent.createIndex({From: 1, To: 1, GoTime: 1, ReturnTime: 1, CreatedBy: 1}, {unique: true});

db.user.createIndex({Phone: 1}, {unique: true});