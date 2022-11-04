const mongoose = require("mongoose");


const SongSchema = mongoose.Schema({
    name:{
        type: String
    },
    duration:{
        type: String
    },
    artist:{
        type: String
    },
    genre:{
        type: String
    },
    path:{
        type: String
    }
});


module.exports = mongoose.model("songs",SongSchema);