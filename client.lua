--[[
    JVL Skillcheck (client). Same API as lib.skillCheck:
        local ok = exports.jvl_skillcheck:SkillCheck({ 'easy', 'medium' }, { 'w', 'a' })
]]

local activo = nil -- promise of the running skill check

local function depurar(mensaje, ...)
    if Config.Debug then print(('^3[jvl_skillcheck]^7 ' .. mensaje):format(...)) end
end

--- Turns 'easy' / { areaSize, speedMultiplier } (or a list of them) into a list of rounds.
local function normalizarRondas(dificultad)
    if type(dificultad) ~= 'table' or dificultad.areaSize then dificultad = { dificultad } end
    local rondas = {}
    for _, ronda in ipairs(dificultad) do
        local datos = type(ronda) == 'string' and Config.Difficulties[ronda] or ronda
        if type(datos) ~= 'table' then datos = Config.Difficulties.easy end
        rondas[#rondas + 1] = {
            areaSize = tonumber(datos.areaSize) or 50,
            speedMultiplier = tonumber(datos.speedMultiplier) or 1.0,
        }
    end
    return rondas
end

--- Runs the skill check. Blocks until it ends and returns true on success.
---@param dificultad string|table
---@param teclas? string[]
---@return boolean|nil
local function skillCheck(dificultad, teclas)
    if activo then return nil end
    activo = promise.new()

    local rondas = normalizarRondas(dificultad or 'easy')
    local lista = {}
    for _, tecla in ipairs(teclas or Config.DefaultKeys) do lista[#lista + 1] = tostring(tecla):lower() end
    if #lista == 0 then lista = { 'e' } end

    depurar('start: %s rounds, keys %s', #rondas, table.concat(lista, ','))
    SetNuiFocus(true, false)
    SendNUIMessage({
        action = 'start',
        rounds = rondas,
        keys = lista,
        baseTurnTime = Config.BaseTurnTime,
        position = Config.Position,
    })

    local resultado = Citizen.Await(activo)
    return resultado
end

--- Cancels the running skill check (counts as a fail).
local function cancelar()
    if activo then SendNUIMessage({ action = 'cancel' }) end
end

RegisterNUICallback('finish', function(datos, cb)
    cb(1)
    if not activo then return end
    SetNuiFocus(false, false)
    local exito = datos and datos.success == true
    if Config.Sounds then
        PlaySoundFrontend(-1, exito and 'PICK_UP' or 'CHECKPOINT_MISSED', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true)
    end
    depurar('finish: %s', tostring(exito))
    local promesa = activo
    activo = nil
    promesa:resolve(exito)
end)

RegisterNUICallback('roundOk', function(_, cb)
    cb(1)
    if Config.Sounds then PlaySoundFrontend(-1, 'NAV_UP_DOWN', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true) end
end)

exports('SkillCheck', skillCheck)
exports('Cancel', cancelar)
exports('IsActive', function() return activo ~= nil end)

-- Never leave the NUI focused if the resource restarts mid check.
AddEventHandler('onResourceStop', function(recurso)
    if recurso == GetCurrentResourceName() and activo then SetNuiFocus(false, false) end
end)

if Config.TestCommand then
    RegisterCommand(Config.TestCommand, function(_, args)
        local dificultad = args[1] or 'easy'
        local veces = tonumber(args[2]) or 3
        local lista = {}
        for i = 1, veces do lista[i] = dificultad end
        local ok = skillCheck(lista, { 'w', 'a', 's', 'd' })
        print(('[jvl_skillcheck] result: %s'):format(tostring(ok)))
    end, false)
end
