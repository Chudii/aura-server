const players = []

const addPlayer = ({ id, name, room }) => {

    // checking num of players in a room
    const numPlayersInRoom = players.filter(player => player.room === room).length
    const existingPlayer = players.find((player) => player.room === room && player.name === name)

    if(existingPlayer)
        return { error: "Username is taken" }


    if (numPlayersInRoom === 20)
        return { error: "Room Full" }

    const newPlayer = { id, name, room }
    players.push(newPlayer)
    return { newPlayer }
}

const removePlayer = id => {
    const removeIndex = players.findIndex(player => player.id === id)

    if (removeIndex !== -1)
        return players.splice(removeIndex, 1)[0]
}

const getPlayer = id => {
    return players.find(player => player.id === id)
}

const getPlayersInRoom = room => {
    return players.filter(player => player.room === room)
}

module.exports = { 
    addPlayer,
    removePlayer,
    getPlayer, 
    getPlayersInRoom
}