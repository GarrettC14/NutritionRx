package com.nutritionrx.wear.data

import android.util.Log
import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * Background service that listens for data/messages from phone app
 * Runs even when the Wear app is not in foreground
 */
class WearDataListenerService : WearableListenerService() {

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        Log.d(TAG, "onDataChanged: ${dataEvents.count} events")

        val dataService = WearDataService.getInstance(applicationContext)
        dataService.processDataEvents(dataEvents)
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        Log.d(TAG, "onMessageReceived: ${messageEvent.path}")

        when (messageEvent.path) {
            PATH_SYNC_COMPLETE -> {
                // Phone confirmed sync complete
                val repository = NutritionRepository.getInstance(applicationContext)
                repository.setSyncStatus(SyncStatus.SUCCESS)
            }
            PATH_ACTION_CONFIRMED -> {
                // Phone confirmed action was processed
                Log.d(TAG, "Action confirmed by phone")
            }
        }
    }

    override fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
        Log.d(TAG, "onCapabilityChanged: ${capabilityInfo.name}, nodes: ${capabilityInfo.nodes.size}")

        val dataService = WearDataService.getInstance(applicationContext)
        dataService.onCapabilityChanged(capabilityInfo)
    }

    companion object {
        private const val TAG = "WearDataListener"

        const val PATH_SYNC_COMPLETE = "/sync/complete"
        const val PATH_ACTION_CONFIRMED = "/action/confirmed"
    }
}
