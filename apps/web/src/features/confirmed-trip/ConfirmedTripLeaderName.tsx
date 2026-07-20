import { UserDisplayName } from '../plan/components/UserDisplayName';
import { getTripLeaderName, type ConfirmedTripRow } from './hooks';

type ConfirmedTripLeaderNameProps = {
  trip: ConfirmedTripRow;
  className?: string;
  badgeClassName?: string;
};

export function ConfirmedTripLeaderName({
  trip,
  className,
  badgeClassName,
}: ConfirmedTripLeaderNameProps): JSX.Element {
  const leaderName = getTripLeaderName(trip).trim();
  if (leaderName === trip.user.name.trim()) {
    return (
      <UserDisplayName
        user={trip.user}
        className={className}
        badgeClassName={badgeClassName}
      />
    );
  }

  return <span className={className}>{leaderName}</span>;
}
