const cmdAction = {};

cmdAction.commandParse = (cliInput) => {
    if (oneArg.length !== 1) {
        console.log(`STARSTRUCK USAGE: 'starstruck command_here'`)
        return
    }
    
    
    if (inputCmd === 'go') {
        // do something to star all repos in link pool
        console.log('go command recognized')
        return
    }
    
    if (inputCmd === 'config') {
        // set an env variable to github user/pw to login
        console.log('config command recognized')
        return
    }
    
    if (inputCmd === 'auto') {
        // set how often this script will run, default will be every X days
        console.log(('auto command recognized'))
        return
    }
    
    if (inputCmd === 'help') {
        console.log(`
        'go': run starstruck immediately\n
        'config': update github login credentials (saved to local env var, never stored online)\n
        'auto': set how often IN SECONDS starstruck checks for new repos to star (default = 7 days)\n
        `)
        return
    }
    
    console.log('command not recognized, try "starstruck help"')
    return 
}

// export default cmdAction;