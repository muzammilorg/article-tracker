import PostsList from './PostsList.jsx';

function getSingleValue(value) {
  return typeof value === 'string' ? value : '';
}

export default async function PostsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    domain: getSingleValue(params.domain),
    author: getSingleValue(params.author),
    date: getSingleValue(params.date),
    month: getSingleValue(params.month),
  };

  return <PostsList filters={filters} />;
}
