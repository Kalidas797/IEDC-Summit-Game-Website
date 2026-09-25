import { useState, useEffect } from 'react';
import { Lock, LogIn, Activity, Settings, Users, Database, Edit, Trash2, Power, Menu, X } from 'lucide-react';
import { supabase } from './supabase';
import type { Game } from '../../shared/types';
import ContentEditor from './ContentEditor';

export default function App() {
  const [session, setSession] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'modules' | 'content' | 'players'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  
  // Real state for metrics and players
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (session) {
      fetchGames();
      fetchLeaderboard();
      fetchMetrics();

      // Supabase Realtime Subscription for Live Updates
      const channel = supabase
        .channel('public:scores')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
          fetchLeaderboard();
          fetchMetrics();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('display_order');
    if (data) setGames(data as Game[]);
  };

  const fetchMetrics = async () => {
    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
    if (count !== null) setTotalPlayers(count);
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('scores')
      .select(`
        id,
        score,
        players ( nickname ),
        games ( name )
      `)
      .order('score', { ascending: false });
      
    if (data) {
      const formattedPlayers = data.map((row: any) => ({
        id: row.id,
        nickname: row.players?.nickname || 'Unknown Player',
        score: row.score,
        game: row.games?.name || 'Unknown Game'
      }));
      setPlayers(formattedPlayers);
    }
  };

  const clearLeaderboard = async () => {
    const confirmed = window.confirm("Are you sure you want to nuke all scores? This cannot be undone.");
    if (!confirmed) return;
    await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    fetchLeaderboard();
  };

  const deleteScore = async (id: string) => {
    await supabase.from('scores').delete().eq('id', id);
    fetchLeaderboard();
  };

  const toggleGameStatus = async (gameId: string, currentStatus: boolean) => {
    await supabase.from('games').update({ enabled: !currentStatus }).eq('id', gameId);
    fetchGames();
  };



  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background text-text">
        <div className="w-full max-w-md admin-card items-center text-center">
          <Lock size={48} className="text-secondary mb-4" />
          <h1 className="text-2xl font-mono font-bold tracking-widest uppercase mb-2 text-primary">
            Admin Access
          </h1>
          <p className="text-muted text-sm mb-8 font-mono">PAPERLAB GAMES ARENA</p>
          
          <input 
            type="email" 
            placeholder="Event Staff Email" 
            className="w-full p-4 bg-background border border-gray-800 text-white font-mono focus:border-secondary outline-none transition-colors mb-4" 
          />
          <input 
            type="password" 
            placeholder="Passcode" 
            className="w-full p-4 bg-background border border-gray-800 text-white font-mono focus:border-secondary outline-none transition-colors mb-8" 
          />
          
          <button 
            className="btn-primary w-full flex justify-center items-center gap-2"
            onClick={() => setSession(true)}
          >
            <LogIn size={20} /> Authorize
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-text overflow-x-hidden relative">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-surface z-40">
        <div className="text-primary font-black text-xl tracking-tighter">PL//ADMIN</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed md:relative inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-64 border-r border-gray-800 bg-surface p-6 flex flex-col gap-6 font-mono text-sm uppercase`}>
        <div className="hidden md:block text-primary font-black text-xl mb-8 tracking-tighter">PL//ADMIN</div>
        
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Activity size={18} /> Dashboard
        </button>
        <button 
          onClick={() => { setActiveTab('modules'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'modules' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Power size={18} /> Game Modules
        </button>
        <button 
          onClick={() => { setActiveTab('content'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'content' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Database size={18} /> Game Content
        </button>
        <button 
          onClick={() => { setActiveTab('players'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'players' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Users size={18} /> Players & Ranks
        </button>
        <button className="flex items-center gap-3 text-muted hover:text-white transition-colors">
          <Settings size={18} /> Settings
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-12 overflow-y-auto w-full">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest mb-1 md:mb-2">
              {activeTab === 'dashboard' ? 'Operations Dashboard' : 
               activeTab === 'modules' ? 'Module Control' : 
               activeTab === 'content' ? 'Content Manager' : 'Player Management'}
            </h1>
            <p className="text-secondary font-mono">
              {activeTab === 'dashboard' ? 'Live Telemetry Active' : 
               activeTab === 'modules' ? 'Enable / Disable Games on Kiosk' : 
               activeTab === 'content' ? 'Configure Dynamic Game Assets' : 'Moderate Leaderboards and Ranks'}
            </p>
          </div>
          <button className="btn-secondary text-sm px-4 py-2" onClick={() => setSession(false)}>
            Lock Terminal
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-card">
              <span className="text-muted font-mono text-xs">TOTAL PLAYERS</span>
              <div className="text-4xl font-bold">{totalPlayers}</div>
            </div>
            <div className="admin-card border-secondary">
              <span className="text-muted font-mono text-xs">ACTIVE DEVICES</span>
              <div className="text-4xl font-bold text-secondary">LIVE</div>
            </div>
            <div className="admin-card border-primary">
              <span className="text-muted font-mono text-xs">TELEMETRY</span>
              <div className="text-4xl font-bold text-primary flex items-center gap-2">
                 <span className="w-3 h-3 bg-lime-400 rounded-full animate-pulse"></span> ONLINE
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map(game => (
              <div key={game.id} className="admin-card">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold uppercase">{game.name}</h3>
                  <button 
                    onClick={() => toggleGameStatus(game.id, game.enabled)}
                    className={`px-4 py-2 font-mono text-xs font-bold uppercase ${game.enabled ? 'bg-lime-400 text-black' : 'bg-red-500 text-white'}`}
                  >
                    {game.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                <p className="text-muted text-sm">{game.description}</p>
              </div>
            ))}
            {games.length === 0 && <p className="text-muted">No games found in database.</p>}
          </div>
        )}

        {activeTab === 'content' && (
          <ContentEditor />
        )}

        {activeTab === 'players' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider">Leaderboard Moderation</h2>
              <button 
                onClick={clearLeaderboard}
                className="btn-secondary text-danger border-danger hover:border-danger hover:bg-danger hover:text-white flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Trash2 size={16} /> CLEAR ALL LEADERBOARDS
              </button>
            </div>
            
            <div className="admin-card bg-gray-900/50 overflow-x-auto">
              <table className="w-full text-left font-mono text-sm min-w-[600px]">
                <thead className="text-muted border-b border-gray-800">
                  <tr>
                    <th className="pb-4 font-normal">PLAYER NICKNAME</th>
                    <th className="pb-4 font-normal">GAME MODULE</th>
                    <th className="pb-4 font-normal">SCORE</th>
                    <th className="pb-4 font-normal text-right">MODERATE</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-surface transition-colors">
                      <td className="py-4 font-bold text-white">{p.nickname}</td>
                      <td className="py-4 text-muted">{p.game}</td>
                      <td className="py-4 text-primary text-xl font-black">{p.score}</td>
                      <td className="py-4 flex justify-end gap-3 text-muted">
                        <button className="hover:text-cyan-400" title="Edit Score"><Edit size={16} /></button>
                        <button 
                          className="hover:text-danger" 
                          title="Delete Rank"
                          onClick={() => deleteScore(p.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
