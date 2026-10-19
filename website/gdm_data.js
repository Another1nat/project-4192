/* Missions and core rules for the game tracker and the Rules / Missions pages. EXAMPLE data: replace with your game's (see README.md). */
window.GDM_DATA = {
    // mission types: each player picks one in game setup (detachments can unlock them with "forceDisposition")
    factions: ['Hold Ground', 'Break Through'],
    // primary mission grid: matrix[my type][opponent's type]
    matrix: [
        ['Example Mission A', 'Example Mission B'],
        ['Example Mission C', 'Example Mission D']
    ],
    primaryMissions: [],
    secondaryMissions: [],  // secondary mission names
    rules: [                // core rules: categories -> rules (html)
        { id: '01', title: 'Core Concepts', rules: [ { id: '01.01', title: 'EXAMPLE RULE', html: '<p>Write your core rules here. Each category has an id, a title and its rules.</p>' } ] }
    ]
};
