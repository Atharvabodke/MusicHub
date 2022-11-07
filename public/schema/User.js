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
    room_id:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "rooms",
    },
    room_status:{
        type:Boolean,
    },
    friends:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "users"
    },
    friend_request:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "users"
    },
    room_request:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "users"
    },
});


module.exports = mongoose.model("users",UserSchema);