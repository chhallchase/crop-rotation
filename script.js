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

        // 🎛️ COMPUTATION SETTINGS - Easy to adjust!
        this.computationSettings = {
            lookaheadDepth: 5,           // How many steps ahead to plan (1 = immediate next step only)
            maxSequenceLength: 3,        // Maximum sequence length to consider
            maxBranchingFactor: 2000,      // Max number of sequences to evaluate per step
            probabilityThreshold: 0.01,  // Ignore probability branches below this threshold
            enableDeepSearch: true      // Whether to use more thorough but slower search
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
        // Start the interactive decision tree
        this.currentGameState = this.getInitialGameState();
        this.activationHistory = [];
        return this.getNextOptimalStep();
    }

    getNextOptimalStep() {
        // Generate possible next activations from current state
        const availableActivations = [];
        
        for (const plot of this.currentGameState.availablePlots) {
            if (plot.active) {
                // Count how many of each color are available vs used
                const colorCounts = {};
                plot.colors.forEach(color => {
                    colorCounts[color] = (colorCounts[color] || 0) + 1;
                });
                
                // Add activations for colors that still have unused instances
                for (const color of Object.keys(colorCounts)) {
                    const totalOfThisColor = colorCounts[color];
                    const usedOfThisColor = plot.usedColorCounts[color] || 0;
                    const remainingOfThisColor = totalOfThisColor - usedOfThisColor;
                    
                    if (remainingOfThisColor > 0) {
                        availableActivations.push({ plotIndex: plot.index, color: color });
                    }
                }
            }
        }

        if (availableActivations.length === 0) {
            return {
                isComplete: true,
                currentState: this.currentGameState,
                history: this.activationHistory
            };
        }

        // Find best next activation using configurable computation settings
        let bestActivation = null;
        let bestExpectedScore = -1;
        let sequencesEvaluated = 0;

        if (this.computationSettings.enableDeepSearch) {
            // More thorough search: generate sequences of different lengths
            const sequences = this.generateLookaheadSequences(
                availableActivations, 
                this.computationSettings.lookaheadDepth
            );
            
            for (const sequence of sequences) {
                if (sequencesEvaluated >= this.computationSettings.maxBranchingFactor) break;
                
                const result = this.calculateExpectedOutcome(sequence, this.currentGameState, 1.0);
                if (result.expectedScore > bestExpectedScore) {
                    bestExpectedScore = result.expectedScore;
                    bestActivation = sequence[0]; // First step of best sequence
                }
                sequencesEvaluated++;
            }
        } else {
            // Fast search: evaluate each activation individually
            for (const activation of availableActivations) {
                if (sequencesEvaluated >= this.computationSettings.maxBranchingFactor) break;
                
                const sequences = [[activation]]; // Single step sequences
                for (const sequence of sequences) {
                    const result = this.calculateExpectedOutcome(sequence, this.currentGameState, 1.0);
                    if (result.expectedScore > bestExpectedScore) {
                        bestExpectedScore = result.expectedScore;
                        bestActivation = activation;
                    }
                }
                sequencesEvaluated++;
            }
        }

        console.log(`Evaluated ${sequencesEvaluated} sequences for next step optimization`);

        return {
            isComplete: false,
            nextActivation: bestActivation,
            currentState: this.currentGameState,
            history: this.activationHistory,
            availableActivations: availableActivations,
            expectedScore: bestExpectedScore,
            computationInfo: {
                sequencesEvaluated: sequencesEvaluated,
                lookaheadDepth: this.computationSettings.lookaheadDepth,
                deepSearch: this.computationSettings.enableDeepSearch
            }
        };
    }

    generateLookaheadSequences(availableActivations, maxDepth) {
        const sequences = [];
        
        // Generate sequences of different lengths up to maxDepth
        for (let depth = 1; depth <= maxDepth; depth++) {
            this.generateSequencesRecursive(availableActivations, depth, [], sequences);
            
            // Limit total sequences to prevent performance issues
            if (sequences.length >= this.computationSettings.maxBranchingFactor) {
                break;
            }
        }
        
        return sequences.slice(0, this.computationSettings.maxBranchingFactor);
    }

    generateSequencesRecursive(availableActivations, remainingDepth, currentSequence, allSequences) {
        if (remainingDepth === 0) {
            allSequences.push([...currentSequence]);
            return;
        }
        
        for (const activation of availableActivations) {
            // Avoid using the same plot twice in a row (basic optimization)
            const lastActivation = currentSequence[currentSequence.length - 1];
            if (lastActivation && lastActivation.plotIndex === activation.plotIndex) {
                continue;
            }
            
            currentSequence.push(activation);
            this.generateSequencesRecursive(availableActivations, remainingDepth - 1, currentSequence, allSequences);
            currentSequence.pop();
        }
    }

    processUserInput(success) {
        if (!this.currentStep || !this.currentStep.nextActivation) return;

        const activation = this.currentStep.nextActivation;
        
        // Record the activation in history
        this.activationHistory.push({
            activation: activation,
            success: success,
            seedsBefore: JSON.parse(JSON.stringify(this.currentGameState.seedCounts))
        });

        // Apply the activation to current state
        this.currentGameState = this.applyPlotActivation(this.currentGameState, activation, success);

        // Get next optimal step
        this.currentStep = this.getNextOptimalStep();
        
        // Update display
        this.displayInteractiveResults();
    }

    undoLastStep() {
        if (this.activationHistory.length === 0) return;

        // Remove last activation from history
        const lastAction = this.activationHistory.pop();
        
        // Restore game state to before last activation
        this.currentGameState = this.getInitialGameState();
        
        // Replay all remaining history
        for (const historyItem of this.activationHistory) {
            this.currentGameState = this.applyPlotActivation(
                this.currentGameState, 
                historyItem.activation, 
                historyItem.success
            );
        }

        // Recalculate optimal next step
        this.currentStep = this.getNextOptimalStep();
        this.displayInteractiveResults();
    }

    displayResults(optimization) {
        // Store the initial step and display interactive interface
        this.currentStep = optimization;
        this.displayInteractiveResults();
    }

    displayInteractiveResults() {
        const step = this.currentStep;
        
        let html = `
            <div class="interactive-decision-tree">
                <h3>🎯 Interactive Decision Tree</h3>
        `;

        // Show current seed counts
        const currentT3 = this.colors.reduce((sum, color) => sum + step.currentState.seedCounts[color][3], 0);
        const currentT4 = this.colors.reduce((sum, color) => sum + step.currentState.seedCounts[color][4], 0);

        html += `
            <div class="current-status" style="background: rgba(255, 215, 0, 0.1); border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #ffd700; margin-bottom: 10px;">Current Status</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div><strong>T3 Seeds:</strong> ${currentT3}</div>
                    <div><strong>T4 Seeds:</strong> ${currentT4}</div>
                    <div><strong>Steps Taken:</strong> ${this.activationHistory.length}</div>
                </div>
            </div>
        `;

        // Show activation history
        if (this.activationHistory.length > 0) {
            html += `
                <div class="activation-history" style="margin: 20px 0;">
                    <h4 style="color: #ffd700; margin-bottom: 10px;">Previous Steps:</h4>
                    <div class="history-steps">
            `;

            this.activationHistory.forEach((historyItem, index) => {
                const plot = this.plots[historyItem.activation.plotIndex];
                const statusColor = historyItem.success ? '#4ecdc4' : '#ff4757';
                const statusText = historyItem.success ? '✅ Success' : '❌ Failed';
                
                html += `
                    <div class="history-step" style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid ${statusColor};">
                        <strong>Step ${index + 1}:</strong> Plot ${historyItem.activation.plotIndex + 1} - Activate ${this.colorEmojis[historyItem.activation.color]} ${historyItem.activation.color.charAt(0).toUpperCase() + historyItem.activation.color.slice(1)}
                        <span style="color: ${statusColor}; margin-left: 10px;">${statusText}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                    <button onclick="optimizer.undoLastStep()" class="btn-secondary" style="margin-top: 10px;">↶ Undo Last Step</button>
                </div>
            `;
        }

        // Show next recommended step or completion
        if (step.isComplete) {
            html += `
                <div class="completion-message" style="background: rgba(76, 205, 196, 0.2); border-radius: 8px; padding: 20px; text-align: center;">
                    <h4 style="color: #4ecdc4;">🎉 Optimization Complete!</h4>
                    <p>No more beneficial activations available.</p>
                    <p><strong>Final T3 Seeds:</strong> ${currentT3} | <strong>Final T4 Seeds:</strong> ${currentT4}</p>
                </div>
            `;
        } else {
            const activation = step.nextActivation;
            const plot = this.plots[activation.plotIndex];
            const upgradedColors = this.colors.filter(c => c !== activation.color);

            html += `
                <div class="next-step" style="background: rgba(255, 215, 0, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h4 style="color: #ffd700; margin-bottom: 15px;">📍 Recommended Next Step:</h4>
                    <div class="recommended-action" style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: 1.1rem; margin-bottom: 8px;">
                            <strong>Plot ${activation.plotIndex + 1} - Activate ${this.colorEmojis[activation.color]} ${activation.color.charAt(0).toUpperCase() + activation.color.slice(1)}</strong>
                        </div>
                        <div style="color: #b0b0b0; font-size: 0.9rem;">
                            Plot contains: ${this.colorEmojis[plot.color1]}/${this.colorEmojis[plot.color2]} • 
                            Will upgrade: ${upgradedColors.map(c => this.colorEmojis[c] + ' ' + c).join(', ')}
                        </div>
                    </div>
                    
                    <div class="action-buttons" style="display: flex; gap: 15px; justify-content: center;">
                        <button onclick="optimizer.processUserInput(true)" class="btn-success" style="background: #4ecdc4; color: #1a1a1a; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            ✅ Success (60%)
                        </button>
                        <button onclick="optimizer.processUserInput(false)" class="btn-failure" style="background: #ff4757; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            ❌ Failed (40%)
                        </button>
                    </div>
                    
                    <p style="text-align: center; margin-top: 15px; font-size: 0.9rem; color: #888;">
                        Try the activation in-game, then click the result above
                    </p>
                </div>
            `;
        }

        // Add restart button
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="optimizer.restartOptimization()" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    🔄 Start Over
                </button>
            </div>
        `;

        html += `</div>`;
        
        this.resultsContent.innerHTML = html;
    }

    restartOptimization() {
        this.currentGameState = this.getInitialGameState();
        this.activationHistory = [];
        this.currentStep = this.getNextOptimalStep();
        this.displayInteractiveResults();
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
                active: true,
                usedColorCounts: {} // Track count of each color used (e.g., {yellow: 1, red: 0})
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

        const activation = remainingSequence[0];
        const remainingAfter = remainingSequence.slice(1);
        
        // Check if plot is still available
        const plot = gameState.availablePlots.find(p => p.index === activation.plotIndex);
        if (!plot || !plot.active) {
            // Plot not available, skip this activation
            return this.calculateExpectedOutcome(remainingAfter, gameState, probability);
        }

        // Calculate outcomes for both success (60%) and failure (40%) scenarios
        const successState = this.applyPlotActivation(gameState, activation, true);
        const failureState = this.applyPlotActivation(gameState, activation, false);
        
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

    applyPlotActivation(gameState, activation, success) {
        // Create a deep copy of the game state
        const newState = {
            availablePlots: gameState.availablePlots.map(p => ({ 
                ...p, 
                colors: [...p.colors],
                usedColorCounts: { ...p.usedColorCounts }
            })),
            seedCounts: {}
        };
        
        // Deep copy seed counts
        for (const color of this.colors) {
            newState.seedCounts[color] = { ...gameState.seedCounts[color] };
        }
        
        const activatedPlot = newState.availablePlots.find(p => p.index === activation.plotIndex);
        const activatedColor = activation.color;
        
        // Determine which colors get upgraded (all colors NOT the activated color)
        const upgradedColors = this.colors.filter(color => color !== activatedColor);
        
        // Upgrade seeds for non-activated colors
        for (const color of upgradedColors) {
            this.upgradeSeeds(newState.seedCounts[color]);
        }
        
        // Handle plot survival based on success/failure
        if (success) {
            // 60% success: increment count of this specific color used
            activatedPlot.usedColorCounts[activatedColor] = (activatedPlot.usedColorCounts[activatedColor] || 0) + 1;
            
            // Check if all color instances in this plot are used
            const colorCounts = {};
            activatedPlot.colors.forEach(color => {
                colorCounts[color] = (colorCounts[color] || 0) + 1;
            });
            
            let allColorsUsed = true;
            for (const color of Object.keys(colorCounts)) {
                const totalOfThisColor = colorCounts[color];
                const usedOfThisColor = activatedPlot.usedColorCounts[color] || 0;
                if (usedOfThisColor < totalOfThisColor) {
                    allColorsUsed = false;
                    break;
                }
            }
            
            if (allColorsUsed) {
                activatedPlot.active = false;
            }
        } else {
            // 40% failure: plot colors cancel each other, entire plot becomes unavailable
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
    window.optimizer = new CropRotationOptimizer();
}); 