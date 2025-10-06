import { NextRequest, NextResponse } from 'next/server';
import { enhancedVacancyMonitor } from '@/lib/monitoring/enhanced-scheduler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const stats = await enhancedVacancyMonitor.getEnhancedStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'health':
        const healthStats = await enhancedVacancyMonitor.getEnhancedStats();
        return NextResponse.json({
          success: true,
          data: {
            systemHealth: healthStats.systemHealth,
            isRunning: healthStats.isRunning,
            lastHealthCheck: healthStats.lastHealthCheck,
            consecutiveFailures: healthStats.consecutiveFailures
          }
        });

      default:
        const defaultStats = await enhancedVacancyMonitor.getEnhancedStats();
        return NextResponse.json({
          success: true,
          data: defaultStats
        });
    }
  } catch (error) {
    console.error('Enhanced monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options } = body;

    switch (action) {
      case 'start':
        enhancedVacancyMonitor.start();
        return NextResponse.json({
          success: true,
          message: 'Enhanced monitoring started'
        });

      case 'stop':
        enhancedVacancyMonitor.stop();
        return NextResponse.json({
          success: true,
          message: 'Enhanced monitoring stopped'
        });

      case 'manual-parse':
        try {
          console.log('🔧 Starting manual parsing with options:', options);
          const parseResults = await enhancedVacancyMonitor.runManualParsing(options || {});
          console.log('✅ Manual parsing completed:', parseResults);
          return NextResponse.json({
            success: true,
            data: parseResults,
            message: `Manual parsing completed: ${parseResults.totalSaved} vacancies saved`
          });
        } catch (parseError) {
          console.error('❌ Manual parsing error:', parseError);
          return NextResponse.json({
            success: false,
            error: `Manual parsing failed: ${parseError.message}`,
            details: parseError.stack
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Enhanced monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}
