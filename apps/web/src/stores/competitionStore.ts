import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  competitionService,
  type Competition,
  type CompetitionEntry,
  type LeaderboardEntry,
  type CompetitionStatistics,
  type CreateCompetitionRequest,
  CompetitionType,
  CompetitionStatus,
  ScoringMetric
} from '../services/competition.service';

interface CompetitionState {
  // State
  competitions: Competition[];
  activeCompetitions: Competition[];
  upcomingCompetitions: Competition[];
  myCompetitions: CompetitionEntry[];
  selectedCompetition: Competition | null;
  leaderboards: Record<string, LeaderboardEntry[]>;
  globalLeaderboard: LeaderboardEntry[];
  userStats: CompetitionStatistics | null;
  selectedGroupId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions - Fetching
  fetchCompetitions: (groupId?: string) => Promise<void>;
  fetchActiveCompetitions: (groupId?: string) => Promise<void>;
  fetchUpcomingCompetitions: (groupId?: string) => Promise<void>;
  fetchCompetition: (id: string) => Promise<void>;
  fetchMyCompetitions: (userId: string) => Promise<void>;
  fetchLeaderboard: (competitionId: string, limit?: number) => Promise<void>;
  fetchGlobalLeaderboard: (metric?: ScoringMetric, period?: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;

  // Actions - Competition Management
  createCompetition: (data: CreateCompetitionRequest) => Promise<Competition>;
  joinCompetition: (competitionId: string, portfolioId?: string) => Promise<void>;
  leaveCompetition: (competitionId: string) => Promise<void>;

  // Actions - UI State
  setSelectedCompetition: (competition: Competition | null) => void;
  setSelectedGroup: (groupId: string | null) => void;
  clearError: () => void;

  // Realtime subscriptions
  subscribeToLeaderboard: (competitionId: string) => () => void;
}

export const useCompetitionStore = create<CompetitionState>()(
  persist(
    (set, get) => ({
      // Initial State
      competitions: [],
      activeCompetitions: [],
      upcomingCompetitions: [],
      myCompetitions: [],
      selectedCompetition: null,
      leaderboards: {},
      globalLeaderboard: [],
      userStats: null,
      selectedGroupId: null,
      isLoading: false,
      error: null,

      // Fetch all competitions
      fetchCompetitions: async (groupId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const competitions = await competitionService.getCompetitions({
            groupId: groupId || get().selectedGroupId || undefined
          });
          set({ competitions, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch competitions',
            isLoading: false
          });
        }
      },

      // Fetch active competitions
      fetchActiveCompetitions: async (groupId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const activeCompetitions = await competitionService.getActiveCompetitions(
            groupId || get().selectedGroupId || undefined
          );
          set({ activeCompetitions, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch active competitions',
            isLoading: false
          });
        }
      },

      // Fetch upcoming competitions
      fetchUpcomingCompetitions: async (groupId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const upcomingCompetitions = await competitionService.getUpcomingCompetitions(
            groupId || get().selectedGroupId || undefined
          );
          set({ upcomingCompetitions, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch upcoming competitions',
            isLoading: false
          });
        }
      },

      // Fetch single competition
      fetchCompetition: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const competition = await competitionService.getCompetition(id);
          if (competition) {
            set({ selectedCompetition: competition, isLoading: false });
          } else {
            set({ error: 'Competition not found', isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch competition',
            isLoading: false
          });
        }
      },

      // Fetch user's competitions
      fetchMyCompetitions: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const myCompetitions = await competitionService.getUserCompetitions(userId);
          set({ myCompetitions, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch your competitions',
            isLoading: false
          });
        }
      },

      // Fetch leaderboard
      fetchLeaderboard: async (competitionId: string, limit: number = 100) => {
        try {
          const leaderboard = await competitionService.getLeaderboard(competitionId, limit);
          set((state) => ({
            leaderboards: {
              ...state.leaderboards,
              [competitionId]: leaderboard
            }
          }));
        } catch (error) {
          console.error('Failed to fetch leaderboard:', error);
        }
      },

      // Fetch global leaderboard
      fetchGlobalLeaderboard: async (
        metric: ScoringMetric = ScoringMetric.TOTAL_RETURN,
        period: string = 'all-time'
      ) => {
        try {
          const globalLeaderboard = await competitionService.getGlobalLeaderboard(
            metric,
            period as any
          );
          set({ globalLeaderboard });
        } catch (error) {
          console.error('Failed to fetch global leaderboard:', error);
        }
      },

      // Fetch user statistics
      fetchUserStats: async (userId: string) => {
        try {
          const userStats = await competitionService.getUserStatistics(userId);
          set({ userStats });
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
        }
      },

      // Create competition
      createCompetition: async (data: CreateCompetitionRequest) => {
        set({ isLoading: true, error: null });
        try {
          const competition = await competitionService.createCompetition(data);
          set((state) => ({
            competitions: [...state.competitions, competition],
            activeCompetitions: [...state.activeCompetitions, competition],
            isLoading: false
          }));
          return competition;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create competition',
            isLoading: false
          });
          throw error;
        }
      },

      // Join competition
      joinCompetition: async (competitionId: string, portfolioId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const entry = await competitionService.joinCompetition(competitionId, portfolioId);
          set((state) => ({
            myCompetitions: [...state.myCompetitions, entry],
            isLoading: false
          }));

          // Update competition participant count
          const competition = get().competitions.find(c => c.id === competitionId);
          if (competition) {
            set((state) => ({
              competitions: state.competitions.map(c =>
                c.id === competitionId
                  ? { ...c, currentParticipants: (c.currentParticipants || 0) + 1 }
                  : c
              )
            }));
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to join competition',
            isLoading: false
          });
          throw error;
        }
      },

      // Leave competition
      leaveCompetition: async (competitionId: string) => {
        set({ isLoading: true, error: null });
        try {
          await competitionService.leaveCompetition(competitionId);
          set((state) => ({
            myCompetitions: state.myCompetitions.filter(c => c.competitionId !== competitionId),
            isLoading: false
          }));

          // Update competition participant count
          const competition = get().competitions.find(c => c.id === competitionId);
          if (competition) {
            set((state) => ({
              competitions: state.competitions.map(c =>
                c.id === competitionId
                  ? { ...c, currentParticipants: Math.max(0, (c.currentParticipants || 0) - 1) }
                  : c
              )
            }));
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to leave competition',
            isLoading: false
          });
          throw error;
        }
      },

      // UI State Management
      setSelectedCompetition: (competition: Competition | null) => {
        set({ selectedCompetition: competition });
      },

      setSelectedGroup: (groupId: string | null) => {
        set({ selectedGroupId: groupId });
      },

      clearError: () => {
        set({ error: null });
      },

      // Subscribe to leaderboard updates
      subscribeToLeaderboard: (competitionId: string) => {
        return competitionService.subscribeToLeaderboard(competitionId, (leaderboard) => {
          set((state) => ({
            leaderboards: {
              ...state.leaderboards,
              [competitionId]: leaderboard
            }
          }));
        });
      }
    }),
    {
      name: 'competition-store',
      partialize: (state) => ({
        selectedGroupId: state.selectedGroupId
      })
    }
  )
);