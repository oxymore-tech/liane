use
liane;

db.rallying_point.createIndex(
  {
    Label: "text",
    Address: "text",
    ZipCode: "text",
    City: "text",
    Location: "2dsphere"
  },
  {
    weights: {
      Label: 10,
      City: 5,
      ZipCode: 5
    },
    name: "TextIndex"
  }
);

db.chat_message.createIndex({CreatedAt: 1});

db.trip_intent.createIndex({From: 1, To: 1, GoTime: 1, ReturnTime: 1, CreatedBy: 1}, {unique: true});

db.user.createIndex({Phone: 1}, {unique: true});