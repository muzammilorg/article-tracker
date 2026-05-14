import mongoose from 'mongoose';

const SiteSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['rss', 'scrape'],
    default: 'rss',
  },
  rssUrl: {
    type: String,
  },
  scrapeConfig: {
    authorSelector: String,
    articleListUrl: String,
    articleLinkSelector: String,
  },
  customFavicon: {
    type: String, // Base64 encoded image
  },
  basePrice: {
    type: Number,
    default: 0,
  },
  primeStarPrice: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export default mongoose.models.Site || mongoose.model('Site', SiteSchema);
