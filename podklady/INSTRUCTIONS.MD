We are making a simplified 2D elite:dangerous. With less mechanics.

it needs to run in the browser. The graphics are simple, it has to be black (greyscale) and white. with some textures for different bodies to differentiate them.
It has to be black on white, space is white.


A spaceship is in the center of the screen, it can turn around. It should be a simple shape.

In the backround are visible stars, which are some distance from our plane. That will affect their "speed" of moving, also some space dust that will become just a lines as will evererything eventually.
Tresholds for stars and space dust to start blurring/smearing. Which means we need a shader for the graphics.

OBJECTIVE:
Basically just the trading aspect of elite:dangerous. The whole game loop will be flying to a space station, where you have to ask the ATC for permission (once you are in range),
than land on your assigned landing pad. There you will be moved into the inside of the station, where you can sell or buy goods on one screen, separated. Each station should have a generated name.
And once you land on it it should get added to your map. Once you land on the spacestation your map gets updated with ist sortiment of goods, and spaceships with a timestamp.
On the space stations you can also refuel, which is just a button.
Each station can havea few ships in stock. Each spaceship will have a different values for their max speed, their cargo space and their fuel efficiency. There should be only like 15 different spaceships, they should get more and more expensive and better, they need cool names like in E:D.


The movement is simple, capped speed at some reasonable value, which is a property of each ship.  you turn towards your goal and just hold for forward, then you have to turn around and slow down.


ECONOMICS
the space stations available goods are based on planets. Planets are procedurally generated (randomly) and have some set export goods. Then those affect the space stations in their proximity, the further the space stations are,
the more expensive the goods get, since you have to move them further. The planets arent shown on the user map.

User Map
Shows all space stations with their name. You can see old data of spacestations you have been on and no data of stations that you havent been to.

