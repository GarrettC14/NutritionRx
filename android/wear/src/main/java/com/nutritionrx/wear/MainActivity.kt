package com.nutritionrx.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.nutritionrx.wear.data.NutritionRepository
import com.nutritionrx.wear.data.WearDataService
import com.nutritionrx.wear.screens.HomeScreen
import com.nutritionrx.wear.screens.QuickAddScreen
import com.nutritionrx.wear.screens.RecentFoodsScreen
import com.nutritionrx.wear.screens.WaterScreen
import com.nutritionrx.wear.theme.NutritionRxWearTheme
import kotlinx.coroutines.launch

/**
 * Main Activity for NutritionRx Wear OS app
 * Uses Wear Compose Navigation for swipe-to-dismiss behavior
 */
class MainActivity : ComponentActivity() {

    private lateinit var repository: NutritionRepository
    private lateinit var dataService: WearDataService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        repository = NutritionRepository.getInstance(applicationContext)
        dataService = WearDataService.getInstance(applicationContext)

        setContent {
            NutritionRxWearApp(
                repository = repository,
                dataService = dataService
            )
        }
    }

    override fun onResume() {
        super.onResume()
        // Check for new day and request sync
        repository.checkAndResetForNewDay()
    }
}

@Composable
fun NutritionRxWearApp(
    repository: NutritionRepository,
    dataService: WearDataService
) {
    val navController = rememberSwipeDismissableNavController()
    val scope = rememberCoroutineScope()

    // Request sync on app launch
    LaunchedEffect(Unit) {
        dataService.requestSync()
    }

    NutritionRxWearTheme {
        SwipeDismissableNavHost(
            navController = navController,
            startDestination = Screen.Home.route
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    repository = repository,
                    onNavigateToWater = {
                        navController.navigate(Screen.Water.route)
                    },
                    onNavigateToQuickAdd = {
                        navController.navigate(Screen.QuickAdd.route)
                    }
                )
            }

            composable(Screen.Water.route) {
                WaterScreen(
                    repository = repository,
                    dataService = dataService,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(Screen.QuickAdd.route) {
                QuickAddScreen(
                    repository = repository,
                    dataService = dataService,
                    onNavigateToRecent = {
                        navController.navigate(Screen.RecentFoods.route)
                    },
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(Screen.RecentFoods.route) {
                RecentFoodsScreen(
                    repository = repository,
                    dataService = dataService,
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}

/**
 * Navigation destinations
 */
sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Water : Screen("water")
    object QuickAdd : Screen("quickadd")
    object RecentFoods : Screen("recent")
}
