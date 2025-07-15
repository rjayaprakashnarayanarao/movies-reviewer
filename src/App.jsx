import { useEffect, useState } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import { useDebounce } from 'react-use'

const API_BASE_URL = 'https://www.omdbapi.com/';
const API_KEY = import.meta.env.VITE_OMDb_API_KEY;
console.log('OMDb API KEY:', import.meta.env.VITE_OMDb_API_KEY);

const DEFAULT_MOVIE = 'Avengers';
const DEFAULT_LIMIT = 20;
const SEARCH_INITIAL_LIMIT = 15;
const SEARCH_LOAD_MORE_COUNT = 10;

const App = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('');
  const [movieList, setMovieList] = useState([]);
  const [allSearchResults, setAllSearchResults] = useState([]); // for search pagination
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1); // OMDb API page
  const [displayCount, setDisplayCount] = useState(SEARCH_INITIAL_LIMIT); // for client-side load more
  const [totalResults, setTotalResults] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

  // Fetch default movies (no search)
  const fetchDefaultMovies = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      let allResults = [];
      let page = 1;
      while (allResults.length < DEFAULT_LIMIT) {
        const endpoint = `${API_BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(DEFAULT_MOVIE)}&page=${page}`;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch movies');
        const data = await response.json();
        if (data.Response === 'False') {
          setErrorMessage(data.Error || 'Failed to fetch movies');
          setMovieList([]);
          return;
        }
        allResults = allResults.concat(data.Search || []);
        if (allResults.length >= DEFAULT_LIMIT || allResults.length >= parseInt(data.totalResults, 10)) break;
        page++;
        if (page > 100) break;
      }
      setMovieList(allResults.slice(0, DEFAULT_LIMIT));
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage('Error fetching movies. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch search results (with pagination)
  const fetchSearchMovies = async (query, page = 1) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const endpoint = `${API_BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=${page}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch movies');
      const data = await response.json();
      if (data.Response === 'False') {
        setErrorMessage(data.Error || 'Failed to fetch movies');
        setAllSearchResults([]);
        setMovieList([]);
        setTotalResults(0);
        return;
      }
      let newResults = data.Search || [];
      let updatedResults = page === 1 ? newResults : [...allSearchResults, ...newResults];
      setAllSearchResults(updatedResults);
      setTotalResults(parseInt(data.totalResults, 10));
      setMovieList(updatedResults.slice(0, displayCount));
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage('Error fetching movies. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect for search
  useEffect(() => {
    if (debouncedSearchTerm) {
      setSearchPage(1);
      setDisplayCount(SEARCH_INITIAL_LIMIT);
      setAllSearchResults([]);
      fetchSearchMovies(debouncedSearchTerm, 1);
    } else {
      setAllSearchResults([]);
      setTotalResults(0);
      setDisplayCount(SEARCH_INITIAL_LIMIT);
      fetchDefaultMovies();
    }
    // eslint-disable-next-line
  }, [debouncedSearchTerm]);

  // Effect for displayCount (load more)
  useEffect(() => {
    if (debouncedSearchTerm) {
      setMovieList(allSearchResults.slice(0, displayCount));
    }
    // eslint-disable-next-line
  }, [displayCount, allSearchResults]);

  // Load more handler
  const handleLoadMore = () => {
    // If we already have enough results, just increase displayCount
    if (allSearchResults.length >= displayCount + SEARCH_LOAD_MORE_COUNT || allSearchResults.length >= totalResults) {
      setDisplayCount(prev => prev + SEARCH_LOAD_MORE_COUNT);
    } else {
      // Otherwise, fetch next page from OMDb
      const nextPage = Math.floor(allSearchResults.length / 10) + 1;
      fetchSearchMovies(debouncedSearchTerm, nextPage);
      setDisplayCount(prev => prev + SEARCH_LOAD_MORE_COUNT);
    }
  };

  // Fetch full details for a movie by imdbID
  const fetchMovieDetails = async (imdbID) => {
    setIsDetailsLoading(true);
    setSelectedMovieDetails(null);
    try {
      const endpoint = `${API_BASE_URL}?apikey=${API_KEY}&i=${imdbID}&plot=full`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch movie details');
      const data = await response.json();
      if (data.Response === 'False') {
        setSelectedMovieDetails(null);
        return;
      }
      setSelectedMovieDetails(data);
    } catch (error) {
      setSelectedMovieDetails(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Handle MovieCard click
  const handleMovieClick = (imdbID) => {
    setSelectedMovieId(imdbID);
    setModalOpen(true);
    fetchMovieDetails(imdbID);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMovieId(null);
    setSelectedMovieDetails(null);
  };

  return (
    <main>
      <div className="pattern"/>
      <div className="wrapper">
        <header>
          <img src="./hero.png" alt="Hero Banner" />
          <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>
        <section className="all-movies">
          <h2>All Movies</h2>
          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <>
              <ul>
                {movieList.map((movie) => (
                  <MovieCard key={movie.imdbID} movie={movie} onClick={() => handleMovieClick(movie.imdbID)} />
                ))}
              </ul>
              {debouncedSearchTerm && movieList.length < totalResults && (
                <button onClick={handleLoadMore} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Load More
                </button>
              )}
            </>
          )}
        </section>
      </div>
      {/* Movie Details Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="relative w-full max-w-3xl mx-0 sm:mx-4 rounded-2xl p-0 shadow-2xl border-0 h-full sm:h-auto flex items-center justify-center"
            style={{ boxShadow: '0 0 40px 8px #7c3aed, 0 0 0 2px #312e81', border: '2px solid #7c3aed', background: 'linear-gradient(135deg, #18122B 80%, #7c3aed 100%)' }}>
            <div className="w-full h-full flex flex-col">
              <button onClick={handleCloseModal} className="absolute top-2 right-2 sm:top-4 sm:right-6 text-white text-3xl font-bold bg-indigo-700 bg-opacity-60 rounded-full w-10 h-10 flex items-center justify-center hover:bg-indigo-500 transition-all z-10">&times;</button>
              <div className="flex-1 overflow-y-auto w-full max-h-full">
                {isDetailsLoading ? (
                  <div className="flex justify-center items-center min-h-[400px]"><Spinner /></div>
                ) : selectedMovieDetails ? (
                  <div className="flex flex-col md:flex-row gap-6 sm:gap-8 p-4 sm:p-8 w-full">
                    {/* Poster */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-4 w-full md:w-auto">
                      <img
                        src={selectedMovieDetails.Poster && selectedMovieDetails.Poster !== 'N/A' ? selectedMovieDetails.Poster : '/no-movie.png'}
                        alt={selectedMovieDetails.Title}
                        className="w-40 sm:w-48 h-auto rounded-xl shadow-lg border-2 border-indigo-400 mx-auto"
                        onError={e => { e.target.onerror = null; e.target.src = '/no-movie.png'; }}
                      />
                      {selectedMovieDetails.Website && selectedMovieDetails.Website !== 'N/A' && (
                        <a href={selectedMovieDetails.Website} target="_blank" rel="noopener noreferrer" className="mt-2 px-3 py-2 sm:px-4 sm:py-2 bg-indigo-500 text-white rounded-lg font-semibold shadow hover:bg-indigo-600 transition-all text-center w-full text-sm sm:text-base">Visit Homepage →</a>
                      )}
                    </div>
                    {/* Details */}
                    <div className="flex-1 flex flex-col gap-3 w-full">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight break-words">{selectedMovieDetails.Title}</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1 md:mt-0">
                          <span className="text-yellow-400 font-bold flex items-center text-base sm:text-lg"><svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>{selectedMovieDetails.imdbRating}/10</span>
                          <span className="bg-indigo-900 text-indigo-200 px-2 py-1 rounded text-xs font-semibold">{selectedMovieDetails.Rated}</span>
                          <span className="bg-indigo-900 text-indigo-200 px-2 py-1 rounded text-xs font-semibold">{selectedMovieDetails.Runtime}</span>
                          <span className="bg-indigo-900 text-indigo-200 px-2 py-1 rounded text-xs font-semibold">{selectedMovieDetails.Year}</span>
                        </div>
                      </div>
                      {/* Genres as tags */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedMovieDetails.Genre && selectedMovieDetails.Genre.split(',').map((genre) => (
                          <span key={genre.trim()} className="bg-indigo-700 text-indigo-100 px-3 py-1 rounded-full text-xs font-semibold shadow">{genre.trim()}</span>
                        ))}
                      </div>
                      {/* Overview */}
                      <div className="mt-3">
                        <h3 className="text-indigo-300 font-semibold mb-1 text-base sm:text-lg">Overview</h3>
                        <p className="text-white text-sm sm:text-base leading-relaxed break-words">{selectedMovieDetails.Plot}</p>
                      </div>
                      {/* Details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-indigo-100 text-xs sm:text-sm">
                        <div><span className="font-semibold text-indigo-300">Release date:</span> <span className="text-white">{selectedMovieDetails.Released}</span></div>
                        <div><span className="font-semibold text-indigo-300">Countries:</span> <span className="text-white">{selectedMovieDetails.Country}</span></div>
                        <div><span className="font-semibold text-indigo-300">Status:</span> <span className="text-white">{selectedMovieDetails.DVD !== 'N/A' ? 'Released' : 'Unknown'}</span></div>
                        <div><span className="font-semibold text-indigo-300">Language:</span> <span className="text-white">{selectedMovieDetails.Language}</span></div>
                        <div><span className="font-semibold text-indigo-300">Budget:</span> <span className="text-white">{selectedMovieDetails.BoxOffice && selectedMovieDetails.BoxOffice !== 'N/A' ? selectedMovieDetails.BoxOffice : 'N/A'}</span></div>
                        <div><span className="font-semibold text-indigo-300">Revenue:</span> <span className="text-white">{selectedMovieDetails.Revenue || 'N/A'}</span></div>
                        <div><span className="font-semibold text-indigo-300">Tagline:</span> <span className="text-white">{selectedMovieDetails.Tagline || 'N/A'}</span></div>
                        <div><span className="font-semibold text-indigo-300">Production Companies:</span> <span className="text-white">{selectedMovieDetails.Production}</span></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-white">No details found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
