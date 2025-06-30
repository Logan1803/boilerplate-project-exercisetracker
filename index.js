require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')

let mongoose = require('mongoose');
console.log(process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true }
}));

let exerciseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

let Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(express.urlencoded({ extended: false }));

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(400).json({ error: 'User not found' });
    let date = req.body.date ? new Date(req.body.date) : new Date();
    if (date.toString() === 'Invalid Date') date = new Date();
    const exercise = new Exercise({
      user: user._id,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: date
    });
    await exercise.save();
    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a user's log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(400).json({ error: 'User not found' });
    let filter = { user: user._id };
    let from = req.query.from ? new Date(req.query.from) : null;
    let to = req.query.to ? new Date(req.query.to) : null;
    let limit = req.query.limit ? parseInt(req.query.limit) : null;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    let query = Exercise.find(filter).select('-__v -user');
    if (limit) query = query.limit(limit);
    const exercises = await query.exec();
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
