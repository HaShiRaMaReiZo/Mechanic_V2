import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppDispatch } from '@/common/hooks/useAppDispatch';
import { useAppSelector } from '@/common/hooks/useAppSelector';
import {
  fetchWeeklySummary,
  fetchPaymentPeriods,
  fetchPeriodServices,
  clearSelectedPeriod,
  refreshData,
} from '@/features/history/historySlice';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AppBackground from '@/components/AppBackground';

export default function HistoryScreen() {
  const dispatch = useAppDispatch();
  const { weeklySummary, paymentPeriods, selectedPeriodServices, selectedPeriodDate, isLoading, isRefreshing, error } = useAppSelector((state) => state.history);

  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  // Fetch data on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchWeeklySummary());
      dispatch(fetchPaymentPeriods());
    }, [dispatch])
  );

  const onRefresh = useCallback(() => {
    dispatch(refreshData());
    dispatch(fetchWeeklySummary());
    dispatch(fetchPaymentPeriods());
    if (selectedPeriodDate) {
      dispatch(fetchPeriodServices(selectedPeriodDate));
    }
  }, [dispatch, selectedPeriodDate]);

  const togglePeriod = async (weekStartDate: string) => {
    if (expandedPeriods.has(weekStartDate)) {
      // Collapse
      const newExpanded = new Set(expandedPeriods);
      newExpanded.delete(weekStartDate);
      setExpandedPeriods(newExpanded);
      if (selectedPeriodDate === weekStartDate) {
        dispatch(clearSelectedPeriod());
      }
    } else {
      // Expand - fetch services
      setExpandedPeriods(new Set([...expandedPeriods, weekStartDate]));
      dispatch(fetchPeriodServices(weekStartDate));
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    // Set to noon to avoid timezone issues
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Format: "Dec 29 - 4" (abbreviated month name, start day - end day, handles month boundaries)
    const monthName = monthNamesShort[start.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    return `${monthName} ${startDay} - ${endDay}`;
  };

  const getStatusIcon = (status: 'pending' | 'paid') => {
    if (status === 'paid') {
      return <IconSymbol name="checkmark.circle.fill" size={20} color="#4CAF50" />;
    }
    return <IconSymbol name="clock.fill" size={20} color="#9E9E9E" />;
  };

  const getStatusText = (status: 'pending' | 'paid') => {
    return status === 'paid' ? 'Paid' : 'Pending';
  };

  const getStatusColor = (status: 'pending' | 'paid') => {
    return status === 'paid' ? '#4CAF50' : '#9E9E9E';
  };

  // Get services for a specific period
  const getServicesForPeriod = (weekStartDate: string) => {
    if (selectedPeriodDate === weekStartDate) {
      return selectedPeriodServices;
    }
    return [];
  };

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
        {/* Current Week Summary - Transparent Card */}
        {weeklySummary && (
          <View style={styles.transparentCard}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekTitle} numberOfLines={1}>
                This Week ({formatWeekRange(weeklySummary.weekStart, weeklySummary.weekEnd)})
              </Text>
              {weeklySummary.daysUntilPayment > 0 && (
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>
                    Payment in {weeklySummary.daysUntilPayment} days
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.totalAmount}>
              {formatAmount(weeklySummary.totalAmount)} MMK
            </Text>
            <Text style={styles.serviceCount}>
              {weeklySummary.serviceCount} service{weeklySummary.serviceCount !== 1 ? 's' : ''} completed for this week
            </Text>
          </View>
        )}

        {/* Current Period Card */}
        {weeklySummary && paymentPeriods.length > 0 && (
          <View style={styles.periodCard}>
            <TouchableOpacity
              style={styles.periodHeader}
              onPress={() => togglePeriod(weeklySummary.weekStart)}
              activeOpacity={0.7}
            >
              <View style={styles.periodHeaderLeft}>
                <View style={styles.calendarIconContainer}>
                  <View style={styles.calendarIconBottom} />
                  <IconSymbol name="calendar" size={24} color="#000000" />
                </View>
                <View style={styles.periodHeaderText}>
                  <View style={styles.periodTitleRow}>
                    <Text style={styles.periodMonth}>{paymentPeriods[0]?.monthName || 'Current'}</Text>
                    {paymentPeriods[0]?.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.periodDateRange}>{paymentPeriods[0]?.dateRange || ''}</Text>
                </View>
              </View>
              <IconSymbol
                name={expandedPeriods.has(weeklySummary.weekStart) ? "chevron.down" : "chevron.right"}
                size={40}
                color="#5A657D"
              />
            </TouchableOpacity>

            <View style={styles.periodSummary}>
              <View style={styles.periodSummaryItem}>
                <Text style={styles.periodSummaryLabel}>{paymentPeriods[0]?.serviceCount || 0} Services</Text>
              </View>
              <View style={styles.periodDivider} />
              <View style={styles.periodSummaryItem}>
                <Text style={styles.periodSummaryAmount}>
                  {formatAmount(paymentPeriods[0]?.totalAmount || 0)} MMK
                </Text>
              </View>
              <View style={styles.periodStatusBadge}>
                {getStatusIcon(paymentPeriods[0]?.paymentStatus || 'pending')}
                <Text style={[styles.periodStatusText, { color: getStatusColor(paymentPeriods[0]?.paymentStatus || 'pending') }]}>
                  {getStatusText(paymentPeriods[0]?.paymentStatus || 'pending')}
                </Text>
              </View>
            </View>

            {/* Expanded Services List */}
            {expandedPeriods.has(weeklySummary.weekStart) && (
              <View style={styles.servicesList}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#666" style={styles.loading} />
                ) : getServicesForPeriod(weeklySummary.weekStart).length > 0 ? (
                  getServicesForPeriod(weeklySummary.weekStart).map((service) => (
                    <View key={service.maintId} style={styles.serviceItem}>
                      <View style={styles.serviceItemHeader}>
                        <IconSymbol name="clock.fill" size={16} color="#666" />
                        <Text style={styles.serviceDate}>{service.dateFormatted}</Text>
                      </View>
                      <Text style={styles.serviceTypes}>{service.serviceTypes}</Text>
                      <View style={styles.serviceDivider} />
                      <View style={styles.serviceFooter}>
                        <View style={styles.serviceFooterLeft}>
                          <Text style={styles.serviceAmount}>{formatAmount(service.amount)} MMK</Text>
                          <IconSymbol name="person.fill" size={14} color="#666" />
                          <Text style={styles.serviceCustomer}>{service.customerName}</Text>
                        </View>
                        <Text style={styles.serviceId}>{service.serviceId}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noServices}>No services found</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Previous Payments Section */}
        {paymentPeriods.length > 1 && (
          <>
            <Text style={styles.previousPaymentsTitle}>Previous Payments</Text>
            {paymentPeriods.slice(1).map((period) => (
              <View key={period.paymentId} style={styles.periodCard}>
                <TouchableOpacity
                  style={styles.periodHeader}
                  onPress={() => togglePeriod(period.weekStartDate)}
                  activeOpacity={0.7}
                >
                  <View style={styles.periodHeaderLeft}>
                    <View style={styles.calendarIconContainer}>
                      <View style={styles.calendarIconBottom} />
                      <IconSymbol name="calendar" size={24} color="#000000" />
                    </View>
                    <View style={styles.periodHeaderText}>
                      <Text style={styles.periodMonth}>{period.monthName}</Text>
                      <Text style={styles.periodDateRange}>{period.dateRange}</Text>
                    </View>
                  </View>
                  <IconSymbol
                    name={expandedPeriods.has(period.weekStartDate) ? "chevron.down" : "chevron.right"}
                    size={40}
                    color="#5A657D"
                  />
                </TouchableOpacity>

                <View style={styles.periodSummary}>
                  <View style={styles.periodSummaryItem}>
                    <Text style={styles.periodSummaryLabel}>{period.serviceCount} Services</Text>
                  </View>
                  <View style={styles.periodDivider} />
                  <View style={styles.periodSummaryItem}>
                    <Text style={styles.periodSummaryAmount}>
                      {formatAmount(period.totalAmount)} MMK
                    </Text>
                  </View>
                  <View style={styles.periodStatusBadge}>
                    {getStatusIcon(period.paymentStatus)}
                    <Text style={[styles.periodStatusText, { color: getStatusColor(period.paymentStatus) }]}>
                      {getStatusText(period.paymentStatus)}
                    </Text>
                  </View>
                </View>

                {/* Expanded Services List */}
                {expandedPeriods.has(period.weekStartDate) && (
                  <View style={styles.servicesList}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#000000" style={styles.loading} />
                    ) : getServicesForPeriod(period.weekStartDate).length > 0 ? (
                      getServicesForPeriod(period.weekStartDate).map((service) => (
                        <View key={service.maintId} style={styles.serviceItem}>
                          <View style={styles.serviceItemHeader}>
                            <IconSymbol name="clock.fill" size={16} color="#666" />
                            <Text style={styles.serviceDate}>{service.dateFormatted}</Text>
                          </View>
                          <Text style={styles.serviceTypes}>{service.serviceTypes}</Text>
                          <View style={styles.serviceDivider} />
                          <View style={styles.serviceFooter}>
                            <View style={styles.serviceFooterLeft}>
                              <Text style={styles.serviceAmount}>{formatAmount(service.amount)} MMK</Text>
                              <IconSymbol name="person.fill" size={14} color="#000000" />
                              <Text style={styles.serviceCustomer}>{service.customerName}</Text>
                            </View>
                            <Text style={styles.serviceId}>{service.serviceId}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noServices}>No services found</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        </ScrollView>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show background
  },
  header: {
    backgroundColor: '#423491',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  transparentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // White 20% opacity
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // White 30% opacity stroke
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  paymentBadge: {
    backgroundColor: '#008EFB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  paymentBadgeText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 8,
    marginTop: 8,
  },
  serviceCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)', // White with slight transparency
  },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  calendarIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 35,
    height: 35,
  },
  calendarIconBottom: {
    position: 'absolute',
    bottom: 0,
    width: 35,
    height: 35,
    backgroundColor: '#DBEAE5',
    borderRadius: 10,
    zIndex: 0,
  },
  periodHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  periodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  periodMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#008EFB', // Match payment badge blue
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  periodDateRange: {
    fontSize: 14,
    color: '#666',
  },
  periodSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  periodSummaryItem: {
    flex: 1,
  },
  periodSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  periodDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  periodSummaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  periodStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: '#F5F5F5', // Light gray background for pending status
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  servicesList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  serviceItem: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  serviceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  serviceTypes: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  serviceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  serviceCustomer: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  serviceId: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  previousPaymentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
    marginBottom: 12,
  },
  loading: {
    padding: 20,
  },
  noServices: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
});
