# PoE Crop Rotation Optimizer 🌱

A web-based optimization tool for Path of Exile's Harvest mechanic, specifically designed to maximize T3 seed yield through optimal crop rotation strategies.

## Features

- **Interactive Plot Configuration**: Configure 3-5 plots with different color combinations
- **Smart Optimization Algorithm**: Calculates the optimal sequence of plot activations
- **Visual Results**: Clear display of optimal rotation sequence and final seed counts
- **Modern UI**: Dark theme with responsive design
- **GitHub Pages Ready**: Static files ready for deployment

## How It Works

### Harvest Mechanics
- **Plots**: Each harvest can have 3, 4, or 5 plots
- **Colors**: Each plot contains 2 colors from Yellow (Primal), Red (Wild), or Blue (Vivid)
- **Seed Tiers**: 4 tiers with upgrade probabilities:
  - T1 → T2: 25% chance
  - T2 → T3: 20% chance  
  - T3 → T4: 5% chance

### Optimization Strategy
- When you activate a plot, all **non-matching** colors get upgraded
- The algorithm tests thousands of possible activation sequences
- Optimizes for maximum T3 seeds while minimizing T4 conversion
- Uses expected value calculations for consistent results

## Usage

1. **Select Plot Count**: Choose between 3, 4, or 5 plots
2. **Configure Colors**: Set the two colors for each plot
3. **Optimize**: Click "Optimize Rotation" to calculate the best sequence
4. **Follow Results**: Execute the suggested plot activation sequence in-game

### Algorithm
- **Sequence Generation**: Creates all possible plot activation sequences up to reasonable lengths
- **Simulation**: Models seed upgrading for each sequence using expected values
- **Scoring**: Weights T3 seeds positively (+10) and T4 seeds negatively (-5)
- **Optimization**: Selects the sequence with the highest score

### Performance
- Handles thousands of sequence combinations efficiently
- Uses web workers simulation for responsive UI
- Optimized for both desktop and mobile devices

## Contributing

Feel free to submit issues or pull requests if you have ideas for improvements:
- Enhanced optimization algorithms
- Additional game mechanics
- UI/UX improvements
- Performance optimizations

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This tool is fan-made and not affiliated with Grinding Gear Games or Path of Exile. Use at your own discretion. 