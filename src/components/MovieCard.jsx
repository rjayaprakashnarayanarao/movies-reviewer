import React, { useEffect, useState } from 'react'

const API_BASE_URL = 'https://www.omdbapi.com/';
const API_KEY = import.meta.env.VITE_OMDb_API_KEY;

const detailsCache = {};

const MovieCard = ({ movie, onClick }) => {
  const { Title, Year, imdbID, Poster, Type } = movie;
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (detailsCache[imdbID]) {
      setDetails(detailsCache[imdbID]);
    } else {
      fetch(`${API_BASE_URL}?apikey=${API_KEY}&i=${imdbID}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.Response !== 'False') {
            detailsCache[imdbID] = data;
            setDetails(data);
          }
        });
    }
    return () => { isMounted = false; };
  }, [imdbID]);

  return (
    <div className="movie-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <img
        src={Poster && Poster !== 'N/A' ? Poster : '/no-movie.png'}
        alt={Title}
        onError={e => { e.target.onerror = null; e.target.src = '/no-movie.png'; }}
      />
      <div className="mt-4">
        <h3>{Title}</h3>
        <div className="content">
          <div className="rating flex items-center gap-1">
            <img src="star.svg" alt="Star Icon" />
            <p className="font-bold text-base text-yellow-400">{details?.imdbRating && details.imdbRating !== 'N/A' ? details.imdbRating : 'N/A'}</p>
          </div>
          <span>•</span>
          <p className="lang">{details?.Language && details.Language !== 'N/A' ? details.Language.split(',')[0] : 'N/A'}</p>
          <span>•</span>
          <p className="year">{Year || 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}
export default MovieCard
