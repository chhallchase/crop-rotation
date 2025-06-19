class CropRotationOptimizer {
    constructor() {
        this.plots = [];
        this.colors = ['yellow', 'red', 'blue'];
        this.colorEmojis = { yellow: '🟡', red: '🔴', blue: '🔵' };
        this.colorNames = { yellow: 'Yellow (Primal)', red: 'Red (Wild)', blue: 'Blue (Vivid)' };
        
        // Upgrade probabilities
        this.upgradeProbabilities = {
            1: 0.25, // T1 → T2
            2: 0.20, // T2 → T3
            3: 0.05  // T3 → T4
        };
        
        this.initializeUI();
    }

    initializeUI() {
        this.plotCountSelect = document.getElementById('plotCount');
        this.plotsContainer = document.getElementById('plotsContainer');
        this.optimizeBtn = document.getElementById('optimizeBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.resultsContent = document.getElementById('resultsContent');

        this.plotCountSelect.addEventListener('change', () => this.generatePlotConfigs());
        this.optimizeBtn.addEventListener('click', () => this.optimizeRotation());

        // Initialize with 3 plots
        this.generatePlotConfigs();
    }

    generatePlotConfigs() {
        const plotCount = parseInt(this.plotCountSelect.value);
        this.plots = [];
        this.plotsContainer.innerHTML = '';

        for (let i = 0; i < plotCount; i++) {
            this.plots.push({ color1: 'yellow', color2: 'red' });
            this.createPlotConfigUI(i);
        }
    }

    createPlotConfigUI(plotIndex) {
        const plotDiv = document.createElement('div');
        plotDiv.className = 'plot-config';
        plotDiv.innerHTML = `
            <h3>Plot ${plotIndex + 1}</h3>
            <div class="color-selection">
                <div class="color-group">
                    <label>Color 1:</label>
                    <div class="color-buttons">
                        <button class="color-btn yellow active" data-plot="${plotIndex}" data-slot="color1" data-color="yellow">
                            🟡 Yellow
                        </button>
                        <button class="color-btn red" data-plot="${plotIndex}" data-slot="color1" data-color="red">
                            🔴 Red
                        </button>
                        <button class="color-btn blue" data-plot="${plotIndex}" data-slot="color1" data-color="blue">
                            🔵 Blue
                        </button>
                    </div>
                </div>
                <div class="color-group">
                    <label>Color 2:</label>
                    <div class="color-buttons">
                        <button class="color-btn yellow" data-plot="${plotIndex}" data-slot="color2" data-color="yellow">
                            🟡 Yellow
                        </button>
                        <button class="color-btn red active" data-plot="${plotIndex}" data-slot="color2" data-color="red">
                            🔴 Red
                        </button>
                        <button class="color-btn blue" data-plot="${plotIndex}" data-slot="color2" data-color="blue">
                            🔵 Blue
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for color selection
        const colorButtons = plotDiv.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectColor(e));
        });

        this.plotsContainer.appendChild(plotDiv);
    }

    selectColor(event) {
        const btn = event.target;
        const plotIndex = parseInt(btn.dataset.plot);
        const slot = btn.dataset.slot;
        const color = btn.dataset.color;

        // Update the plot data
        this.plots[plotIndex][slot] = color;

        // Update UI - remove active class from siblings and add to clicked button
        const siblings = btn.parentElement.querySelectorAll('.color-btn');
        siblings.forEach(sibling => sibling.classList.remove('active'));
        btn.classList.add('active');
    }

    async optimizeRotation() {
        this.showLoading(true);
        
        // Simulate computation time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            const result = this.calculateOptimalRotation();
            this.displayResults(result);
        } catch (error) {
            this.displayError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    calculateOptimalRotation() {
        // Generate all possible activation sequences with probability trees
        const plotCount = this.plots.length;
        const sequences = this.generateOptimalSequences(plotCount);
        
        let bestSequence = null;
        let bestExpectedScore = -1;
        let bestResults = null;

        for (const sequence of sequences) {
            const result = this.simulateSequenceWithProbabilities(sequence);
            
            if (result.expectedScore > bestExpectedScore) {
                bestExpectedScore = result.expectedScore;
                bestSequence = sequence;
                bestResults = result;
            }
        }

        return {
            sequence: bestSequence,
            results: bestResults,
            score: bestExpectedScore
        };
    }

    generateOptimalSequences(plotCount) {
        const sequences = [];
        
        // Generate sequences of different lengths (1-5 activations is usually optimal)
        for (let length = 1; length <= Math.min(5, plotCount); length++) {
            this.generateSequencesOfLength(plotCount, length, [], sequences);
            
            // Limit to prevent performance issues
            if (sequences.length > 500) {
                break;
            }
        }
        
        console.log(`Generated ${sequences.length} sequences for probability tree analysis`);
        return sequences;
    }

    generateSequencesOfLength(plotCount, length, current, sequences) {
        if (current.length === length) {
            sequences.push([...current]);
            return;
        }
        
        for (let plotIndex = 0; plotIndex < plotCount; plotIndex++) {
            current.push(plotIndex);
            this.generateSequencesOfLength(plotCount, length, current, sequences);
            current.pop();
        }
    }

    simulateSequenceWithProbabilities(sequence) {
        // Calculate expected outcome across all probability branches
        return this.calculateExpectedOutcome(sequence, this.getInitialGameState(), 1.0);
    }

    getInitialGameState() {
        // Initial game state: all plots available, 23 T1 seeds per color
        const seedCounts = {};
        for (const color of this.colors) {
            seedCounts[color] = { 1: 23, 2: 0, 3: 0, 4: 0 };
        }
        
        return {
            availablePlots: this.plots.map((plot, index) => ({ 
                index, 
                colors: [plot.color1, plot.color2],
                active: true 
            })),
            seedCounts: seedCounts
        };
    }

    calculateExpectedOutcome(remainingSequence, gameState, probability) {
        // Base case: no more activations
        if (remainingSequence.length === 0) {
            const totalT3 = this.colors.reduce((sum, color) => sum + gameState.seedCounts[color][3], 0);
            const totalT4 = this.colors.reduce((sum, color) => sum + gameState.seedCounts[color][4], 0);
            const score = totalT3 * 10 + totalT4 * -5;
            
            return {
                expectedScore: score * probability,
                expectedT3: totalT3 * probability,
                expectedT4: totalT4 * probability,
                probability: probability,
                outcomes: [{
                    seedCounts: gameState.seedCounts,
                    probability: probability,
                    totalT3: totalT3,
                    totalT4: totalT4
                }]
            };
        }

        const plotIndex = remainingSequence[0];
        const remainingAfter = remainingSequence.slice(1);
        
        // Check if plot is still available
        const plot = gameState.availablePlots.find(p => p.index === plotIndex);
        if (!plot || !plot.active) {
            // Plot not available, skip this activation
            return this.calculateExpectedOutcome(remainingAfter, gameState, probability);
        }

        // Calculate outcomes for both success (60%) and failure (40%) scenarios
        const successState = this.applyPlotActivation(gameState, plotIndex, true);
        const failureState = this.applyPlotActivation(gameState, plotIndex, false);
        
        const successOutcome = this.calculateExpectedOutcome(remainingAfter, successState, probability * 0.6);
        const failureOutcome = this.calculateExpectedOutcome(remainingAfter, failureState, probability * 0.4);
        
        // Combine outcomes
        return {
            expectedScore: successOutcome.expectedScore + failureOutcome.expectedScore,
            expectedT3: successOutcome.expectedT3 + failureOutcome.expectedT3,
            expectedT4: successOutcome.expectedT4 + failureOutcome.expectedT4,
            probability: probability,
            outcomes: [...successOutcome.outcomes, ...failureOutcome.outcomes]
        };
    }

    applyPlotActivation(gameState, plotIndex, success) {
        // Create a deep copy of the game state
        const newState = {
            availablePlots: gameState.availablePlots.map(p => ({ ...p, colors: [...p.colors] })),
            seedCounts: {}
        };
        
        // Deep copy seed counts
        for (const color of this.colors) {
            newState.seedCounts[color] = { ...gameState.seedCounts[color] };
        }
        
        const activatedPlot = newState.availablePlots.find(p => p.index === plotIndex);
        const plotColors = activatedPlot.colors;
        
        // Determine which colors get upgraded (all colors NOT in the activated plot)
        const upgradedColors = this.colors.filter(color => 
            !plotColors.includes(color)
        );
        
        // Upgrade seeds for non-plot colors
        for (const color of upgradedColors) {
            this.upgradeSeeds(newState.seedCounts[color]);
        }
        
        // Handle plot survival based on success/failure
        if (success) {
            // 60% success: plot survives, can potentially be activated again
            // (In practice, you might want to mark it as used to avoid infinite loops)
            activatedPlot.active = false; // Disable for this simulation to prevent loops
        } else {
            // 40% failure: plot colors cancel each other, plot becomes unavailable
            activatedPlot.active = false;
        }
        
        return newState;
    }

    upgradeSeeds(colorSeeds) {
        // Upgrade from T3 to T4 first (to avoid upgrading newly created T3s)
        const t3ToT4 = this.applyUpgradeChance(colorSeeds[3], this.upgradeProbabilities[3]);
        colorSeeds[3] -= t3ToT4;
        colorSeeds[4] += t3ToT4;

        // Upgrade from T2 to T3
        const t2ToT3 = this.applyUpgradeChance(colorSeeds[2], this.upgradeProbabilities[2]);
        colorSeeds[2] -= t2ToT3;
        colorSeeds[3] += t2ToT3;

        // Upgrade from T1 to T2
        const t1ToT2 = this.applyUpgradeChance(colorSeeds[1], this.upgradeProbabilities[1]);
        colorSeeds[1] -= t1ToT2;
        colorSeeds[2] += t1ToT2;
    }

    applyUpgradeChance(seedCount, probability) {
        // Use probabilistic simulation for more realistic results
        if (seedCount === 0) return 0;
        
        // For small numbers, use binomial distribution simulation
        if (seedCount <= 10) {
            let upgraded = 0;
            for (let i = 0; i < seedCount; i++) {
                if (Math.random() < probability) {
                    upgraded++;
                }
            }
            return upgraded;
        }
        
        // For larger numbers, use expected value with rounding
        return Math.round(seedCount * probability);
    }

    displayResults(optimization) {
        const { sequence, results, score } = optimization;
        
        let html = `
            <div class="rotation-sequence">
                <h3>Optimal Activation Sequence (Expected Value)</h3>
                <div class="sequence-steps">
        `;
        
        sequence.forEach((plotIndex, step) => {
            const plot = this.plots[plotIndex];
            html += `
                <div class="step">
                    Step ${step + 1}: Plot ${plotIndex + 1} 
                    (${this.colorEmojis[plot.color1]} ${this.colorEmojis[plot.color2]})
                </div>
            `;
        });
        
        html += `
                </div>
                <p style="margin-top: 10px; font-size: 0.9rem; color: #b0b0b0;">
                    Each activation has 60% success rate. Results show expected values across all probability branches.
                </p>
            </div>
            
            <div class="probability-summary" style="background: rgba(255, 215, 0, 0.1); border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-bottom: 10px;">Expected Outcomes</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <strong>Expected T3 Seeds:</strong> ${results.expectedT3.toFixed(1)}
                    </div>
                    <div>
                        <strong>Expected T4 Seeds:</strong> ${results.expectedT4.toFixed(1)}
                    </div>
                </div>
            </div>
        `;

        // Show probability distribution of outcomes
        if (results.outcomes && results.outcomes.length > 1) {
            html += `
                <div class="outcome-distribution">
                    <h3>Possible Outcomes</h3>
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Probability</th>
                                <th>T3 Seeds</th>
                                <th>T4 Seeds</th>
                                <th>Scenario</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Sort outcomes by probability (highest first) and show top ones
            const sortedOutcomes = results.outcomes
                .sort((a, b) => b.probability - a.probability)
                .slice(0, 10); // Show top 10 most likely outcomes
            
            sortedOutcomes.forEach(outcome => {
                const percentage = (outcome.probability * 100).toFixed(1);
                html += `
                    <tr>
                        <td>${percentage}%</td>
                        <td><strong>${outcome.totalT3}</strong></td>
                        <td>${outcome.totalT4}</td>
                        <td style="font-size: 0.8rem;">
                            ${outcome.probability > 0.3 ? 'High success' : 
                              outcome.probability > 0.1 ? 'Moderate success' : 'Low probability'}
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        html += `
            <div class="summary" style="margin-top: 20px; padding: 20px; background: rgba(255, 215, 0, 0.1); border-radius: 8px;">
                <h3 style="color: #ffd700; margin-bottom: 10px;">Strategy Summary</h3>
                <p><strong>Expected Score:</strong> ${score.toFixed(1)}</p>
                <p><strong>Sequence Length:</strong> ${sequence.length} activations</p>
                <p><strong>Risk Level:</strong> ${this.getRiskLevel(results.outcomes)}</p>
                <p style="margin-top: 10px; font-size: 0.9rem; color: #b0b0b0;">
                    This strategy accounts for the 60% success rate of plot activations and shows expected returns.
                </p>
            </div>
        `;
        
        this.resultsContent.innerHTML = html;
    }

    getRiskLevel(outcomes) {
        if (!outcomes || outcomes.length <= 1) return "Low";
        
        // Calculate variance in outcomes
        const probabilities = outcomes.map(o => o.probability);
        const maxProb = Math.max(...probabilities);
        
        if (maxProb > 0.6) return "Low - High success probability";
        if (maxProb > 0.3) return "Moderate - Mixed outcomes";
        return "High - Many possible outcomes";
    }

    displayError(message) {
        this.resultsContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff4757;">
                <h3>Optimization Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        this.optimizeBtn.disabled = show;
        if (show) {
            this.resultsContent.innerHTML = '';
        }
    }
}

// Initialize the optimizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CropRotationOptimizer();
}); 