import { motion } from 'framer-motion';
import ExplainerCard from './ExplainerCard';
import BossBattle from './BossBattle';
import LevelMap from './LevelMap';
import VictoryScreen from './VictoryScreen';

interface GameComponent {
  type: string;
  props: Record<string, unknown>;
}

interface DynamicGameLoaderProps {
  components: GameComponent[];
  onProgress: (result?: { correct?: boolean; xp?: number }) => void;
  onComplete: () => void;
  isLoading: boolean;
  stats?: {
    questionsAnswered: number;
    correctAnswers: number;
    xpEarned: number;
    startTime: number;
  };
}

// Component mapping
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  explainer: ExplainerCard,
  bossBattle: BossBattle,
  levelMap: LevelMap,
  victory: VictoryScreen,
};

export default function DynamicGameLoader({
  components,
  onProgress,
  onComplete,
  isLoading,
  stats,
}: DynamicGameLoaderProps) {
  return (
    <div className="space-y-6">
      {components.map((component, index) => {
        const Component = COMPONENT_MAP[component.type];

        if (!Component) {
          console.warn(`Unknown component type: ${component.type}`);
          return null;
        }

        return (
          <motion.div
            key={`${component.type}-${index}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <Component
              {...component.props}
              // Override stats for VictoryScreen
              {...(component.type === 'victory' && stats ? {
                stats: {
                    questionsAnswered: stats.questionsAnswered,
                    accuracy: stats.questionsAnswered > 0 ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0,
                    xpEarned: stats.xpEarned,
                    timeSpent: Math.round((Date.now() - stats.startTime) / 60000) + 'm'
                }
              } : {})}
              onProgress={onProgress}
              onComplete={onComplete}
              isLoading={isLoading}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
