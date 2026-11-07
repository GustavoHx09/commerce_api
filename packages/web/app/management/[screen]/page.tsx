import { notFound } from 'next/navigation';
import { screens } from '../config';
import ResourceScreen from '../ResourceScreen';
import PosScreen from '../PosScreen';
import ReportScreen from '../ReportScreen';
import { AccountScreen, CompanyScreen, ExportScreen } from '../SettingsScreen';
import PresetsScreen from '../PresetsScreen';
import PlatformScreen from '../PlatformScreen';
import SupportScreen from '../SupportScreen';

export default async function ManagementPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (screen === 'pos') return <PosScreen />;
  if (screen === 'reports') return <ReportScreen />;
  if (screen === 'company') return <CompanyScreen />;
  if (screen === 'account') return <AccountScreen />;
  if (screen === 'exports') return <ExportScreen />;
  if (screen === 'presets') return <PresetsScreen />;
  if (screen === 'platform') return <PlatformScreen />;
  if (screen === 'support') return <SupportScreen />;
  if (!screens[screen]) notFound();
  return <ResourceScreen key={screen} screen={screens[screen]} />;
}
