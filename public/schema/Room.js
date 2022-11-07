const mongoose = require("mongoose");


const RoomSchema = mongoose.Schema({
    createdBy:{
        type: mongoose.SchemaTypes.ObjectId,
        ref: "users",
        required: true
    },
    in_room:{
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "users"
    }
});


module.exports = mongoose.model("rooms",RoomSchema);