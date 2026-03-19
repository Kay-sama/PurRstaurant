const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

// Normally we'd use an actual database but that's to much effort so it's in memory
const db = {
    restaurant: {
        name: 'Mrlw\'s Purr-fect Plates',
        address: 'Catery 19',
        phone: '0694206969',
        description: 'Expect gourmet meals with a twist: a dash of catnip-inspired creativity,' +
            ' a sprinkle of mischievousness, and flavors so good you might just \'knead\' for ' +
            'seconds. Whether you\'re craving a classic pizza or our famous \'paw-sta,\' Mrlw ' +
            'guarantees a meow-nificent dining experience.',
        testimonials: [
            {
                author: 'The Gourmet Gazette',
                content: 'We\'ve reviewed thousands of restaurants, but none had a chef as cha' +
                    'rismatic as Mrlw. The paw-sta was exquisite, and the pizza… well, it\'s b' +
                    'asically a catwalk of flavor. Highly recommended!'
            },
            {
                author: 'Epicurean Weekly',
                content: 'The only restaurant we\'ve visited where the chef inspects your dess' +
                    'ert with a critical glare before approval. Delightfully eccentric, absolu' +
                    'tely delicious.'
            },
            {
                author: 'Michelin',
                content: 'Some might argue this is unsanitory but we\'d rather focus on the taste'
            }
        ]
    },
    menu: [
        { id: 1, name: 'Pizza Margherita', description: 'Classic thin-crust pizza topped with fresh tomato sauce, mozzarella, and basil.', price: 12 },
        { id: 2, name: 'Spaghetti Carbonara', description: 'Creamy pasta with eggs, pecorino cheese, guanciale, and black pepper.', price: 10 },
        { id: 3, name: 'Lasagna Bolognese', description: 'Layers of pasta, ground beef, and tomato sauce, topped with mozzarella and Parmesan cheese.', price: 13 },
        { id: 4, name: 'Risotto ai Funghi', description: 'Creamy risotto with wild mushrooms, Parmesan cheese, and butter.', price: 14 },
        { id: 5, name: 'Caprese Salad', description: 'Fresh mozzarella, ripe tomatoes, basil, and balsamic glaze.', price: 8 },
        { id: 6, name: 'Bruschetta al Pomodoro', description: 'Toasted bread topped with fresh tomatoes, basil, and garlic.', price: 7 },
        { id: 7, name: 'Tiramisu', description: 'Layers of espresso-soaked ladyfingers, mascarpone cheese, and cocoa powder.', price: 6 },
        { id: 8, name: 'Panna Cotta', description: 'Creamy dessert with mascarpone cheese, vanilla, and ladyfingers.', price: 6 },
        { id: 9, name: 'Focaccia with Rosemary', description: 'Classic Italian flatbread with rosemary and olive oil.', price: 5 },
        { id: 10, name: 'Gnocchi al Pesto', description: 'Creamy pasta with fresh pesto sauce, mozzarella, and parmesan cheese.', price: 11 },
        { id: 11, name: 'Paw-sta', description: 'Traditional Italian dessert made with paw paw, cream, and sugar.', price: 29 }
    ],
    employees: [
        { id: 1, username: 'admin', password: 'root', role: 'admin' },
    ],
};

// Express & socket creation
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

// Auth stuff
const SECRET = 'supersecret';

generateToken = (user) => jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '8h' });

authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || header.split(' ').length < 2) return res.status(401).json({ error: 'Missing token' });
    const token = header.split(' ')[1];
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role) return res.status(401).json({ error: 'Unauthorized' });
    next();
};

//
// Endpoints from here on
//

// Get (can be used by everyone)
app.get('/restaurant/info', (req, res) => {
    console.info('/restaurant/info was called');
    res.json(db.restaurant);
});

app.get('/menu', (req, res) => {
    console.info('/menu was called');
    res.json(db.menu);
});

// Return a token if it's a valid user
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.employees.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token });
});

// Menu management (Admin & Employee only)
app.post('/menu', authenticate, (req, res) => {
    const item = { id: Date.now(), ...req.body };
    db.menu.push(item);
    io.emit('menuUpdated');
    res.json(item);
});

app.put('/menu/:id', authenticate, (req, res) => {
    const item = db.menu.find(m => m.id == req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    Object.assign(item, req.body);
    io.emit('menuUpdated');
    res.json(item);
});

app.delete('/menu/:id', authenticate, (req, res) => {
    db.menu = db.menu.filter(m => m.id != req.params.id);
    io.emit('menuUpdated');
    res.json({ success: true });
});

// Employee management (Admin only)
app.get('/employees', authenticate, requireRole('admin'), (req, res) => {
    res.json(db.employees);
});

app.post('/employees', authenticate, requireRole('admin'), (req, res) => {
    const employee = { id: Date.now(), ...req.body };
    db.employees.push(employee);
    io.emit('employeesUpdated');
    res.json(employee);
});

app.put('/employees/:id', authenticate, requireRole('admin'), (req, res) => {
    const employee = db.employees.find(e => e.id == req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    Object.assign(employee, req.body);
    io.emit('employeesUpdated');
    res.json(employee);
});

app.delete('/employees/:id', authenticate, requireRole('admin'), (req, res) => {
    db.employees = db.employees.filter(e => e.id != req.params.id);
    io.emit('employeesUpdated');
    res.json({ success: true });
});

app.put('/restaurant/info', authenticate, (req, res) => {
    Object.assign(db.restaurant, req.body);
    io.emit('restaurantUpdated');
    res.json(db.restaurant);
});

// Run the app and register for socket connections
io.on('connection', socket => {
    console.info('Client connected:', socket.id);
});

server.listen(3000, () => {
    console.info('Server running on http://localhost:3000');
});