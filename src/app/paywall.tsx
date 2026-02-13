import * as Sentry from '@sentry/react-native';
import { CrashFallbackScreen } from '@/components/CrashFallbackScreen';
import { PaywallScreen } from '@/components/premium/PaywallScreen';

export default function PaywallRoute() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashFallbackScreen resetError={resetError} />}>
      <PaywallScreen />
    </Sentry.ErrorBoundary>
  );
}
