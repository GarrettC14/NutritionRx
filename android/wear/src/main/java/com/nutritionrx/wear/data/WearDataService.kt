package com.nutritionrx.wear.data

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Service for Wearable Data Layer communication with phone app
 * Handles bidirectional sync of nutrition data
 */
class WearDataService(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val messageClient: MessageClient = Wearable.getMessageClient(context)
    private val dataClient: DataClient = Wearable.getDataClient(context)
    private val capabilityClient: CapabilityClient = Wearable.getCapabilityClient(context)

    private val repository = NutritionRepository.getInstance(context)

    private val _connectedNode = MutableStateFlow<Node?>(null)
    val connectedNode: StateFlow<Node?> = _connectedNode.asStateFlow()

    private val _isPhoneConnected = MutableStateFlow(false)
    val isPhoneConnected: StateFlow<Boolean> = _isPhoneConnected.asStateFlow()

    init {
        // Check for connected phone on initialization
        scope.launch {
            checkPhoneConnection()
        }
    }

    /**
     * Check if phone app is connected and reachable
     */
    suspend fun checkPhoneConnection(): Boolean {
        return try {
            val capabilityInfo = capabilityClient
                .getCapability(PHONE_CAPABILITY, CapabilityClient.FILTER_REACHABLE)
                .await()

            val node = pickBestNode(capabilityInfo.nodes)
            _connectedNode.value = node
            _isPhoneConnected.value = node != null

            if (node == null) {
                repository.setSyncStatus(SyncStatus.PHONE_NOT_CONNECTED)
            }

            node != null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check phone connection", e)
            _isPhoneConnected.value = false
            repository.setSyncStatus(SyncStatus.PHONE_NOT_CONNECTED)
            false
        }
    }

    /**
     * Send action to phone app
     */
    suspend fun sendAction(action: WearAction): Boolean {
        val node = _connectedNode.value ?: run {
            if (!checkPhoneConnection()) {
                return false
            }
            _connectedNode.value
        } ?: return false

        return try {
            repository.setSyncStatus(SyncStatus.SYNCING)

            // Apply optimistic update locally
            when (action) {
                is WearAction.AddWater -> repository.incrementWater(action.glasses)
                is WearAction.QuickAdd -> repository.addCalories(action.calories)
                is WearAction.LogFood -> {} // Will be updated on sync response
                is WearAction.RequestSync -> {}
            }

            // Send to phone
            messageClient
                .sendMessage(node.id, action.toPath(), action.toData())
                .await()

            repository.setSyncStatus(SyncStatus.SUCCESS)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send action: $action", e)
            repository.setSyncStatus(SyncStatus.ERROR)
            false
        }
    }

    /**
     * Request full sync from phone
     */
    suspend fun requestSync(): Boolean {
        return sendAction(WearAction.RequestSync)
    }

    /**
     * Process incoming data from phone
     */
    fun processDataEvents(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED) {
                val dataItem = event.dataItem
                when (dataItem.uri.path) {
                    PATH_DAILY_SUMMARY -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        val json = dataMap.getString(KEY_DATA)
                        json?.let {
                            DailySummary.fromJson(it)?.let { summary ->
                                repository.updateDailySummary(summary)
                                repository.setSyncStatus(SyncStatus.SUCCESS)
                            }
                        }
                    }
                    PATH_RECENT_FOODS -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        val json = dataMap.getString(KEY_DATA)
                        json?.let {
                            val foods = RecentFood.listFromJson(it)
                            repository.updateRecentFoods(foods)
                        }
                    }
                    PATH_FASTING_STATE -> {
                        val dataMap = DataMapItem.fromDataItem(dataItem).dataMap
                        val json = dataMap.getString(KEY_DATA)
                        json?.let {
                            FastingState.fromJson(it)?.let { state ->
                                repository.updateFastingState(state)
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Handle capability change (phone connected/disconnected)
     */
    fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
        val node = pickBestNode(capabilityInfo.nodes)
        _connectedNode.value = node
        _isPhoneConnected.value = node != null

        if (node == null) {
            repository.setSyncStatus(SyncStatus.PHONE_NOT_CONNECTED)
        } else {
            // Phone reconnected, request sync
            scope.launch {
                requestSync()
            }
        }
    }

    /**
     * Pick the best node to communicate with (prefer nearby)
     */
    private fun pickBestNode(nodes: Set<Node>): Node? {
        return nodes.firstOrNull { it.isNearby } ?: nodes.firstOrNull()
    }

    companion object {
        private const val TAG = "WearDataService"

        // Capability name declared in phone app
        const val PHONE_CAPABILITY = "nutritionrx_phone"

        // Data paths
        const val PATH_DAILY_SUMMARY = "/data/daily_summary"
        const val PATH_RECENT_FOODS = "/data/recent_foods"
        const val PATH_FASTING_STATE = "/data/fasting_state"

        // Data keys
        const val KEY_DATA = "data"

        @Volatile
        private var instance: WearDataService? = null

        fun getInstance(context: Context): WearDataService {
            return instance ?: synchronized(this) {
                instance ?: WearDataService(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
}
