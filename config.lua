--[[
    JVL SKILLCHECK | Configuration
    Same difficulties as ox_lib: 'easy', 'medium', 'hard' or { areaSize = degrees, speedMultiplier = n }.
]]

Config = {}

-- Prints extra information to the client console.
Config.Debug = false

-- Keys used when the caller does not pass any (one is picked at random each round).
Config.DefaultKeys = { 'e' }

-- Preset difficulties. areaSize = size of the target zone in degrees, speedMultiplier = indicator speed.
Config.Difficulties = {
    easy = { areaSize = 50, speedMultiplier = 1.0 },
    medium = { areaSize = 40, speedMultiplier = 1.5 },
    hard = { areaSize = 25, speedMultiplier = 1.75 },
}

-- Milliseconds the indicator takes to do a full turn at speedMultiplier = 1.0.
Config.BaseTurnTime = 2000

-- Position on screen: 'center', 'bottom'.
Config.Position = 'center'

-- Plays GTA frontend sounds on success / fail.
Config.Sounds = true

-- Test command (false to disable): /testskill [easy|medium|hard] [rounds]
Config.TestCommand = 'testskill'
