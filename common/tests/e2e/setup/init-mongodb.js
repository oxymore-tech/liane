db.createCollection("user");
db.user.insertMany([
  {
    _id: ObjectId("641c748f942295971af567f9"),
    createdAt: new Date(1679586447652),
    isAdmin: true,
    phone: "+33000111111",
    userInfo: {
      lastName: "Doe",
      firstName: "John",
      gender: "Unspecified"
    }
  }
]);
