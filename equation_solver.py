"""
Equation Solver Problem Analysis

STEP 1: UNDERSTAND THE PROBLEM
- Parse equations of form: ax + b = cx + d (where a,b,c,d are integers)
- Only '+', '-' operations and variable 'x' with coefficients
- Return: "x=value", "No solution", or "Infinite solutions"

STEP 2: ALGORITHM APPROACH
- Split equation by '=' to get left and right sides
- Parse each side to extract coefficient of x and constant term
- Rearrange to: (a-c)x = (d-b)
- Solve based on coefficient of x

STEP 3: EDGE CASES
- If coefficient of x is 0 and constants equal → Infinite solutions
- If coefficient of x is 0 and constants different → No solution  
- Otherwise → One solution: x = constant_diff / x_coefficient
"""

def solve_equation(equation):
    """
    Solve linear equation with variable x.
    
    Args:
        equation (str): Equation string like "x+5-3+x=6+x-2"
    
    Returns:
        str: "x=value", "No solution", or "Infinite solutions"
    """
    # Split by '=' to get left and right sides
    left, right = equation.split('=')
    
    # Parse each side to get coefficient of x and constant
    left_x_coeff, left_const = parse_expression(left)
    right_x_coeff, right_const = parse_expression(right)
    
    # Rearrange to form: (left_x_coeff - right_x_coeff) * x = (right_const - left_const)
    x_coeff = left_x_coeff - right_x_coeff
    const_diff = right_const - left_const
    
    # Solve based on x coefficient
    if x_coeff == 0:
        if const_diff == 0:
            return "Infinite solutions"
        else:
            return "No solution"
    else:
        x_value = const_diff // x_coeff
        return f"x={x_value}"

def parse_expression(expr):
    """
    Parse expression to extract coefficient of x and constant term.
    
    Args:
        expr (str): Expression like "x+5-3+x" or "6+x-2"
    
    Returns:
        tuple: (x_coefficient, constant_term)
    """
    expr = expr.replace(' ', '')  # Remove spaces
    x_coeff = 0
    constant = 0
    
    # Add '+' at beginning if doesn't start with '+' or '-'
    if expr[0] not in ['+', '-']:
        expr = '+' + expr
    
    i = 0
    while i < len(expr):
        # Get the sign
        sign = 1 if expr[i] == '+' else -1
        i += 1
        
        # Get the term (until next '+' or '-' or end)
        term = ''
        while i < len(expr) and expr[i] not in ['+', '-']:
            term += expr[i]
            i += 1
        
        # Process the term
        if 'x' in term:
            # Extract coefficient of x
            coeff_str = term.replace('x', '')
            if coeff_str == '' or coeff_str == '+':
                coeff = 1
            elif coeff_str == '-':
                coeff = -1
            else:
                coeff = int(coeff_str)
            x_coeff += sign * coeff
        else:
            # It's a constant term
            if term:  # Not empty
                constant += sign * int(term)
    
    return x_coeff, constant

# Test cases
def test_solve_equation():
    test_cases = [
        ("x+5-3+x=6+x-2", "x=2"),
        ("x=x", "Infinite solutions"),
        ("2x=x", "x=0"),
        ("2x+3=x+1", "x=-2"),
        ("x+1=x+2", "No solution"),
        ("3x-2=3x-2", "Infinite solutions"),
        ("x=5", "x=5"),
        ("2x=8", "x=4")
    ]
    
    print("Testing equation solver:")
    print("=" * 40)
    
    for i, (equation, expected) in enumerate(test_cases, 1):
        result = solve_equation(equation)
        status = "✓" if result == expected else "✗"
        print(f"Test {i}: {equation}")
        print(f"Expected: {expected}")
        print(f"Got: {result} {status}")
        print("-" * 30)

if __name__ == "__main__":
    test_solve_equation()