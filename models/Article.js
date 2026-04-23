import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  publishedAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

export default mongoose.models.Article || mongoose.model('Article', ArticleSchema);
