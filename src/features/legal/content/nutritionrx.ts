export interface DisclaimerSection {
  icon: string;
  title: string;
  body: string | string[];
}

export interface DisclaimerContent {
  introText: string;
  buttonText: string;
  sections: DisclaimerSection[];
}

export const NUTRITION_DISCLAIMER_CONTENT: DisclaimerContent = {
  introText: "Let's set some expectations so you can use this app in the healthiest way possible.",
  buttonText: "Let's Get Started",

  sections: [
    {
      icon: 'nutrition-outline',
      title: 'FOOD IS FUEL, NOT MATH',
      body: "NutritionRx helps you understand what you eat and build awareness of your nutrition patterns.\n\nOur calorie and macro targets are estimates based on general formulas—they're a starting point, not a prescription.",
    },
    {
      icon: 'heart-outline',
      title: 'YOUR WELLBEING MATTERS',
      body: "If you have diabetes, kidney disease, food allergies, or any health condition affected by diet, please work with a doctor or registered dietitian alongside this app.\n\nCalorie tracking isn't right for everyone. If you have a history of disordered eating, please consider whether this tool is helpful for you—and reach out to a professional if you need support.",
    },
    {
      icon: 'scale-outline',
      title: 'THE FINE PRINT',
      body: [
        'This app provides educational information, not medical or dietary treatment',
        'Calorie and nutrition targets are estimates that may not suit your specific needs',
        'Changing your diet can affect your health—consult a professional if you have concerns',
        "You're responsible for making food choices that are right for your body",
      ],
    },
  ],
};
