const mongoose = require("mongoose");


const UserSchema = mongoose.Schema({
    username:{
        type: String
    },
    password:{
        type: String
    },
    socket_id:{
        type: String
    },
    friends:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "users"
    },
    friend_request:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "users"
    },
    playlist:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "songs"
    },
});


module.exports = mongoose.model("users",UserSchema);