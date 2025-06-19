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
            maxBranchingFactor: 2000,    // Max number of sequences to evaluate per step
            probabilityThreshold: 0.01,  // Ignore probability branches below this threshold
            enableDeepSearch: true       // Whether to use more thorough but slower search
        };
        
        this.initializeUI();
    }

    initializeUI() {
        this.plotCountSelect = document.getElementById('plotCount');
        this.plotsContainer = document.getElementById('plotsContainer');
        this.optimizeBtn = document.getElementById('optimizeBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.resultsContent = document.getElementById('resultsContent');

        // Computation settings UI elements
        this.performancePreset = document.getElementById('performancePreset');
        this.lookaheadDepthInput = document.getElementById('lookaheadDepth');
        this.maxBranchingFactorInput = document.getElementById('maxBranchingFactor');
        this.enableDeepSearchInput = document.getElementById('enableDeepSearch');
        this.probabilityThresholdInput = document.getElementById('probabilityThreshold');
        this.customSettingsDiv = document.getElementById('customSettings');

        this.plotCountSelect.addEventListener('change', () => this.generatePlotConfigs());
        this.optimizeBtn.addEventListener('click', () => this.optimizeRotation());

        // Computation settings event handlers
        this.performancePreset.addEventListener('change', () => this.handlePresetChange());
        this.lookaheadDepthInput.addEventListener('change', () => this.updateComputationSettings());
        this.maxBranchingFactorInput.addEventListener('change', () => this.updateComputationSettings());
        this.enableDeepSearchInput.addEventListener('change', () => this.updateComputationSettings());
        this.probabilityThresholdInput.addEventListener('change', () => this.updateComputationSettings());

        // Initialize with 3 plots
        this.generatePlotConfigs();
        
        // Initialize UI with current settings
        this.syncUIWithSettings();
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
        try {
            // Start the interactive decision tree
            this.currentGameState = this.getInitialGameState();
            this.activationHistory = [];
            return this.getNextOptimalStep();
        } catch (error) {
            console.error('Error in calculateOptimalRotation:', error);
            console.error('Current game state:', this.currentGameState);
            console.error('Plots configuration:', this.plots);
            throw new Error(`Optimization failed: ${error.message}. Check console for details.`);
        }
    }

    getNextOptimalStep() {
        // Generate possible next activations (field activations)
        const availableActivations = [];
        
        for (const plot of this.currentGameState.availablePlots) {
            if (plot.active) {
                // Check each color in this plot
                plot.colors.forEach((color, colorIndex) => {
                    if (!plot.usedColors.includes(color)) {
                        availableActivations.push({ 
                            plotIndex: plot.index, 
                            color: color,
                            fieldIndex: colorIndex 
                        });
                    }
                });
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
        // Get the next optimal step to find the current activation
        const step = this.getNextOptimalStep();
        if (!step || step.isComplete || !step.nextActivation) return;

        const activation = step.nextActivation;
        
        // Store the success/failure result for later use
        this.pendingActivationResult = { activation, success };
        
        // ALWAYS show upgrade input form since upgrades happen on both success and failure
        this.showUpgradeInputForm(activation);
    }

    showUpgradeInputForm(activation) {
        const activatedColor = activation.color;
        const isSuccess = this.pendingActivationResult?.success ?? true;
        
        // Find all fields that will be upgraded (all fields with different colors than activated)
        const fieldsToUpgrade = this.currentGameState.plotFields.filter(field => 
            field.color !== activatedColor && !field.used
        );
        
        let html = `
            <div class="upgrade-input-form" style="background: rgba(76, 205, 196, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: ${isSuccess ? '#4ecdc4' : '#ff6b6b'}; margin-bottom: 15px;">
                    ${isSuccess ? '✅ Activation Successful!' : '❌ Activation Failed!'}
                </h4>
                <p style="margin-bottom: 15px;">
                    <strong>Plot ${activation.plotIndex + 1} - ${this.colorEmojis[activation.color]} ${activation.color.charAt(0).toUpperCase() + activation.color.slice(1)}</strong> 
                    ${isSuccess ? 'succeeded' : 'failed'}!
                </p>
                <p style="margin-bottom: 20px; color: #b0b0b0;">
                    ${isSuccess 
                        ? 'All non-activated color fields get upgraded, and you can activate the other field in this plot later.'
                        : 'All non-activated color fields still get upgraded, but this plot becomes unavailable for future activations.'
                    }
                </p>
                <p style="margin-bottom: 20px; color: #b0b0b0;">
                    Please enter the actual upgrade results for each affected field:
                </p>
                
                <div class="upgrade-inputs">
        `;

        fieldsToUpgrade.forEach((field, index) => {
            html += `
                <div class="field-upgrade-input" style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h5 style="color: #ffd700; margin-bottom: 10px;">
                        Plot ${field.plotIndex + 1} - ${this.colorEmojis[field.color]} ${this.colorNames[field.color]} Field
                    </h5>
                    <div style="font-size: 0.9rem; color: #888; margin-bottom: 10px;">
                        Current: ${field.seeds[1]} T1, ${field.seeds[2]} T2, ${field.seeds[3]} T3, ${field.seeds[4]} T4
                    </div>
                    <div class="upgrade-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 0.8rem;">T1→T2:</label>
                            <input type="number" id="upgrade_field_${index}_1to2" min="0" max="${field.seeds[1]}" value="${Math.round(field.seeds[1] * 0.25)}" style="width: 100%; padding: 5px;">
                        </div>
                        <div>
                            <label style="font-size: 0.8rem;">T2→T3:</label>
                            <input type="number" id="upgrade_field_${index}_2to3" min="0" max="${field.seeds[2]}" value="${Math.round(field.seeds[2] * 0.20)}" style="width: 100%; padding: 5px;">
                        </div>
                        <div>
                            <label style="font-size: 0.8rem;">T3→T4:</label>
                            <input type="number" id="upgrade_field_${index}_3to4" min="0" max="${field.seeds[3]}" value="${Math.round(field.seeds[3] * 0.05)}" style="width: 100%; padding: 5px;">
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="optimizer.processFieldUpgradeResults('${activation.plotIndex}', '${activation.color}', ${fieldsToUpgrade.length})" 
                            style="background: #4ecdc4; color: #1a1a1a; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Continue with These Results
                    </button>
                    <button onclick="optimizer.useExpectedValues('${activation.plotIndex}', '${activation.color}')" 
                            style="background: rgba(255, 255, 255, 0.1); color: #e0e0e0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; margin-left: 10px; cursor: pointer;">
                        Use Expected Values
                    </button>
                </div>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    processFieldUpgradeResults(plotIndex, color, fieldCount) {
        const activation = { plotIndex: parseInt(plotIndex), color: color };
        const success = this.pendingActivationResult?.success ?? true;
        const activatedColor = color;
        
        // Find all fields that were upgraded
        const fieldsToUpgrade = this.currentGameState.plotFields.filter(field => 
            field.color !== activatedColor && !field.used
        );
        
        // Collect actual upgrade results for each field
        const fieldUpgrades = {};
        fieldsToUpgrade.forEach((field, index) => {
            const fieldKey = `${field.plotIndex}_${field.fieldIndex}`;
            const t1to2 = parseInt(document.getElementById(`upgrade_field_${index}_1to2`).value) || 0;
            const t2to3 = parseInt(document.getElementById(`upgrade_field_${index}_2to3`).value) || 0;
            const t3to4 = parseInt(document.getElementById(`upgrade_field_${index}_3to4`).value) || 0;
            
            fieldUpgrades[fieldKey] = {
                t1to2: t1to2,
                t2to3: t2to3,
                t3to4: t3to4
            };
        });

        this.completeActivation(activation, success, fieldUpgrades);
        this.pendingActivationResult = null; // Clear the stored result
    }

    useExpectedValues(plotIndex, color) {
        const activation = { plotIndex: parseInt(plotIndex), color: color };
        const success = this.pendingActivationResult?.success ?? true;
        this.completeActivation(activation, success);
        this.pendingActivationResult = null; // Clear the stored result
    }

    completeActivation(activation, success, actualUpgrades = null) {
        // Record this activation in history
        this.activationHistory.push({
            activation: activation,
            success: success,
            actualUpgrades: actualUpgrades,
            seedsBefore: JSON.parse(JSON.stringify(this.currentGameState.plotFields))
        });

        // Apply the activation to current state
        this.currentGameState = this.applyFieldActivation(this.currentGameState, activation, success, actualUpgrades);

        // Get next optimal step
        const nextStep = this.getNextOptimalStep();
        this.displayStep(nextStep);
    }

    applyFieldActivation(gameState, activation, success, actualUpgrades = null) {
        // Create a deep copy of the game state
        const newState = {
            availablePlots: gameState.availablePlots.map(p => ({ 
                ...p, 
                colors: [...p.colors],
                usedColors: [...p.usedColors]
            })),
            plotFields: gameState.plotFields.map(f => ({ 
                ...f, 
                seeds: { ...f.seeds }
            }))
        };
        
        const activatedColor = activation.color;
        const activatedPlot = newState.availablePlots.find(p => p.index === activation.plotIndex);
        
        // ALWAYS mark this color as used (regardless of success/failure)
        activatedPlot.usedColors.push(activatedColor);
        
        // ALWAYS apply upgrades to all fields with different colors (regardless of success/failure)
        const fieldsToUpgrade = newState.plotFields.filter(field => 
            field.color !== activatedColor && !field.used
        );
        
        // Apply upgrades to each field
        fieldsToUpgrade.forEach((field, index) => {
            if (actualUpgrades) {
                // Use actual upgrade results
                const fieldKey = `${field.plotIndex}_${field.fieldIndex}`;
                const upgrades = actualUpgrades[fieldKey];
                if (upgrades) {
                    field.seeds[1] -= upgrades.t1to2;
                    field.seeds[2] += upgrades.t1to2 - upgrades.t2to3;
                    field.seeds[3] += upgrades.t2to3 - upgrades.t3to4;
                    field.seeds[4] += upgrades.t3to4;
                    
                    // Ensure no negative values
                    for (let tier = 1; tier <= 4; tier++) {
                        field.seeds[tier] = Math.max(0, field.seeds[tier]);
                    }
                }
            } else {
                // Use expected values
                this.upgradeSeeds(field.seeds);
            }
        });
        
        if (success) {
            // 60% success: Plot stays active, can activate the other color too
            // Check if this plot is fully used (both colors activated)
            const plotColors = this.plots[activation.plotIndex];
            const allColorsUsed = [plotColors.color1, plotColors.color2].every(color => 
                activatedPlot.usedColors.includes(color)
            );
            
            if (allColorsUsed) {
                activatedPlot.active = false;
            }
        } else {
            // 40% failure: Plot becomes unavailable (can't activate the other color)
            activatedPlot.active = false;
        }
        
        return newState;
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
        const currentT3 = step.currentState.plotFields
            .filter(field => field.color && field.seeds)
            .reduce((sum, field) => sum + field.seeds[3], 0);
        const currentT4 = step.currentState.plotFields
            .filter(field => field.color && field.seeds)
            .reduce((sum, field) => sum + field.seeds[4], 0);

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
                    <button onclick="optimizer.undoLastActivation()" class="btn-secondary" style="margin-top: 10px;">↶ Undo Last Step</button>
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
        // Each plot has 2 fields, each field has 23 T1 seeds
        const plotFields = [];
        
        this.plots.forEach((plot, plotIndex) => {
            if (!plot.color1 || !plot.color2) {
                throw new Error(`Plot ${plotIndex + 1} has invalid color configuration`);
            }
            
            // Add field for color 1
            plotFields.push({
                plotIndex: plotIndex,
                fieldIndex: 0,
                color: plot.color1,
                seeds: { 1: 23, 2: 0, 3: 0, 4: 0 },
                used: false
            });
            
            // Add field for color 2
            plotFields.push({
                plotIndex: plotIndex,
                fieldIndex: 1,
                color: plot.color2,
                seeds: { 1: 23, 2: 0, 3: 0, 4: 0 },
                used: false
            });
        });
        
        return {
            availablePlots: this.plots.map((plot, index) => ({ 
                index, 
                colors: [plot.color1, plot.color2],
                active: true,
                usedColors: [] // Track which colors in this plot have been activated
            })),
            plotFields: plotFields
        };
    }

    calculateExpectedOutcome(remainingSequence, gameState, probability) {
        // Base case: no more activations
        if (remainingSequence.length === 0) {
            const totalT3 = gameState.plotFields.reduce((sum, field) => sum + field.seeds[3], 0);
            const totalT4 = gameState.plotFields.reduce((sum, field) => sum + field.seeds[4], 0);
            const score = totalT3 * 10 + totalT4 * -5;
            
            return {
                expectedScore: score * probability,
                expectedT3: totalT3 * probability,
                expectedT4: totalT4 * probability,
                probability: probability,
                outcomes: [{
                    plotFields: gameState.plotFields,
                    probability: probability,
                    totalT3: totalT3,
                    totalT4: totalT4
                }]
            };
        }

        const activation = remainingSequence[0];
        const remainingAfter = remainingSequence.slice(1);
        
        // Check if this activation is still possible
        const plot = gameState.availablePlots.find(p => p.index === activation.plotIndex);
        if (!plot || !plot.active || plot.usedColors.includes(activation.color)) {
            // Activation not possible, skip it
            return this.calculateExpectedOutcome(remainingAfter, gameState, probability);
        }

        // Calculate outcomes for both success (60%) and failure (40%) scenarios
        const successState = this.applyFieldActivation(gameState, activation, true);
        const failureState = this.applyFieldActivation(gameState, activation, false);
        
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
        // Use deterministic expected values for consistent optimization results
        if (seedCount === 0) return 0;
        
        // Always use expected value calculation for deterministic results
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

    handlePresetChange() {
        const preset = this.performancePreset.value;
        
        if (preset === 'custom') {
            this.customSettingsDiv.style.display = 'block';
            return;
        }

        // Apply preset values
        const presets = {
            fast: {
                lookaheadDepth: 2,
                maxBranchingFactor: 20,
                enableDeepSearch: false,
                probabilityThreshold: 0.05
            },
            balanced: {
                lookaheadDepth: 3,
                maxBranchingFactor: 100,
                enableDeepSearch: true,
                probabilityThreshold: 0.02
            },
            thorough: {
                lookaheadDepth: 5,
                maxBranchingFactor: 2000,
                enableDeepSearch: true,
                probabilityThreshold: 0.01
            }
        };

        if (presets[preset]) {
            this.computationSettings = { ...this.computationSettings, ...presets[preset] };
            this.syncUIWithSettings();
        }

        this.customSettingsDiv.style.display = preset === 'custom' ? 'block' : 'none';
    }

    updateComputationSettings() {
        this.computationSettings.lookaheadDepth = parseInt(this.lookaheadDepthInput.value);
        this.computationSettings.maxBranchingFactor = parseInt(this.maxBranchingFactorInput.value);
        this.computationSettings.enableDeepSearch = this.enableDeepSearchInput.checked;
        this.computationSettings.probabilityThreshold = parseFloat(this.probabilityThresholdInput.value);
        
        // Switch to custom when user manually changes values
        this.performancePreset.value = 'custom';
        this.customSettingsDiv.style.display = 'block';
    }

    syncUIWithSettings() {
        this.lookaheadDepthInput.value = this.computationSettings.lookaheadDepth;
        this.maxBranchingFactorInput.value = this.computationSettings.maxBranchingFactor;
        this.enableDeepSearchInput.checked = this.computationSettings.enableDeepSearch;
        this.probabilityThresholdInput.value = this.computationSettings.probabilityThreshold;
    }

    undoLastActivation() {
        if (this.activationHistory.length === 0) {
            alert('No activations to undo!');
            return;
        }

        // Remove last activation from history
        this.activationHistory.pop();

        // Reset to initial state and replay history
        this.currentGameState = this.getInitialGameState();

        // Replay all remaining history
        for (const historyItem of this.activationHistory) {
            this.currentGameState = this.applyFieldActivation(
                this.currentGameState, 
                historyItem.activation, 
                historyItem.success,
                historyItem.actualUpgrades
            );
        }

        // Get and display next optimal step
        const nextStep = this.getNextOptimalStep();
        this.displayStep(nextStep);
    }

    displayStep(step) {
        let html = '';

        if (step.isComplete) {
            // Calculate final totals
            const totalT3 = step.currentState.plotFields.reduce((sum, field) => sum + field.seeds[3], 0);
            const totalT4 = step.currentState.plotFields.reduce((sum, field) => sum + field.seeds[4], 0);
            
            html = `
                <div class="final-results" style="background: rgba(76, 205, 196, 0.15); border-radius: 12px; padding: 30px; text-align: center;">
                    <h3 style="color: #4ecdc4; margin-bottom: 20px;">🎯 Optimization Complete!</h3>
                    <div style="font-size: 1.2rem; margin-bottom: 20px;">
                        <div style="margin-bottom: 10px;">
                            <span style="color: #ffd700;">Total T3 Seeds: ${totalT3}</span>
                        </div>
                        <div style="color: #ff6b6b;">
                            Total T4 Seeds: ${totalT4}
                        </div>
                    </div>
                    
                    <h4 style="color: #ffd700; margin: 20px 0 15px;">Final Field States:</h4>
                    <div class="field-results" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 20px;">
            `;
            
            step.currentState.plotFields.forEach(field => {
                html += `
                    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 15px;">
                        <h5 style="color: #ffd700; margin-bottom: 10px;">
                            Plot ${field.plotIndex + 1} - ${this.colorEmojis[field.color]} ${this.colorNames[field.color]}
                        </h5>
                        <div style="font-size: 0.9rem;">
                            T1: ${field.seeds[1]} | T2: ${field.seeds[2]} | 
                            <span style="color: #ffd700;">T3: ${field.seeds[3]}</span> | 
                            <span style="color: #ff6b6b;">T4: ${field.seeds[4]}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <button onclick="optimizer.resetOptimization()" 
                            style="background: #6c5ce7; color: white; border: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; cursor: pointer;">
                        Start New Optimization
                    </button>
                </div>
            `;
        } else {
            // Show current step
            const activation = step.nextActivation;
            const plot = this.plots[activation.plotIndex];
            
            html = `
                <div class="optimization-step" style="background: rgba(108, 92, 231, 0.1); border-radius: 12px; padding: 25px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h3 style="color: #6c5ce7; margin-bottom: 10px;">
                            🎯 Next Optimal Move
                        </h3>
                        <div style="font-size: 1.1rem; color: #e0e0e0;">
                            Activate <strong>Plot ${activation.plotIndex + 1}</strong> - 
                            ${this.colorEmojis[activation.color]} <strong>${activation.color.charAt(0).toUpperCase() + activation.color.slice(1)}</strong>
                        </div>
                    </div>

                    <div class="action-buttons" style="text-align: center; margin-bottom: 25px;">
                        <button onclick="optimizer.processUserInput(true)" 
                                style="background: #4ecdc4; color: #1a1a1a; border: none; padding: 15px 30px; border-radius: 8px; font-size: 1rem; font-weight: 600; margin: 0 10px; cursor: pointer;">
                            ✅ Success (60%)
                        </button>
                        <button onclick="optimizer.processUserInput(false)" 
                                style="background: #e74c3c; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 1rem; font-weight: 600; margin: 0 10px; cursor: pointer;">
                            ❌ Failure (40%)
                        </button>
                    </div>
            `;

            // Show current field states
            const totalT3 = step.currentState.plotFields.reduce((sum, field) => sum + field.seeds[3], 0);
            const totalT4 = step.currentState.plotFields.reduce((sum, field) => sum + field.seeds[4], 0);

            html += `
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: #ffd700; margin-bottom: 15px;">Current State</h4>
                        <div style="text-align: center; margin-bottom: 15px; font-size: 1.1rem;">
                            <span style="color: #ffd700;">Total T3: ${totalT3}</span> | 
                            <span style="color: #ff6b6b;">Total T4: ${totalT4}</span>
                        </div>
                        
                        <div class="field-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            `;
            
            step.currentState.plotFields.forEach(field => {
                const isUsed = step.currentState.availablePlots.find(p => p.index === field.plotIndex)?.usedColors.includes(field.color);
                html += `
                    <div style="background: rgba(255, 255, 255, ${isUsed ? '0.02' : '0.08'}); border-radius: 6px; padding: 10px; ${isUsed ? 'opacity: 0.5;' : ''}">
                        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 5px;">
                            Plot ${field.plotIndex + 1} - ${this.colorEmojis[field.color]} ${this.colorNames[field.color]}
                            ${isUsed ? ' (Used)' : ''}
                        </div>
                        <div style="font-size: 0.8rem;">
                            T1: ${field.seeds[1]} | T2: ${field.seeds[2]} | 
                            T3: ${field.seeds[3]} | T4: ${field.seeds[4]}
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
            `;

            // Show computation details if available
            if (step.computationInfo) {
                html += `
                    <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 15px; margin-top: 15px; font-size: 0.9rem; color: #888;">
                        <strong>Computation Details:</strong> 
                        Evaluated ${step.computationInfo.sequencesEvaluated} sequences | 
                        Lookahead: ${step.computationInfo.lookaheadDepth} steps | 
                        Deep Search: ${step.computationInfo.deepSearch ? 'On' : 'Off'}
                        ${step.expectedScore ? ` | Expected Score: ${step.expectedScore.toFixed(1)}` : ''}
                    </div>
                `;
            }

            html += `</div>`;
        }

        this.resultsContent.innerHTML = html;
    }
}

// Initialize the optimizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.optimizer = new CropRotationOptimizer();
}); 