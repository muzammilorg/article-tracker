import dbConnect from './lib/mongodb.js';
import Article from './models/Article.js';

async function run() {
  await dbConnect();
  const articles = await Article.find({ domain: /dailycelebs/i, author: /elite/i, deleted: { $ne: true } }).lean();
  console.log(JSON.stringify(articles, null, 2));
  process.exit(0);
}

run();
